import { maximumAssistance } from '../tutor/pblTutorPedagogy';
import type {
  PBLSession,
  PBLAttempt,
  DiagnosticResult,
  InterventionPayload,
  NextActionDecision,
  PBLReflectionDecision,
  PBLCompetencyOutcome,
  PBLTutorEpisode,
  PBLTutorTurn,
  PBLAttemptStage,
  PBLConfidenceLevel,
  PBLAssistanceLevel,
} from '../../../types/pbl';
import { IPBLRepository, pblRepository } from '../data/PBLRepository';
import { SessionPlanner, SessionPlanRequest } from './SessionPlanner';
import { CaseSelector } from './CaseSelector';
import { AttemptEvaluator, EvaluateAttemptParams } from './AttemptEvaluator';
import { DiagnosticResolver } from './DiagnosticResolver';
import { InterventionPlanner } from './InterventionPlanner';
import { TransferSelector } from './TransferSelector';
import { MasteryUpdater } from './MasteryUpdater';
import { NextActionPolicy } from './NextActionPolicy';
import { QuestionPoolSelector } from './QuestionPoolSelector';
import { getRecentQuestionEncounterRefs } from '../../questionEncounterLedger';
import { deductPBLSessionWaitTime } from '../session/PBLSessionTiming';

export interface PBLReflectionSubmission {
  decision: PBLReflectionDecision;
  note: string;
  suggestedRule: string;
  assistanceUsed?: boolean;
  revealedSuggestedRule?: boolean;
}

export class PBLEngine {
  public sessionPlanner: SessionPlanner;
  public caseSelector: CaseSelector;
  public attemptEvaluator: AttemptEvaluator;
  public diagnosticResolver: DiagnosticResolver;
  public interventionPlanner: InterventionPlanner;
  public transferSelector: TransferSelector;
  public masteryUpdater: MasteryUpdater;
  public nextActionPolicy: NextActionPolicy;

  constructor(public repo: IPBLRepository = pblRepository) {
    this.sessionPlanner = new SessionPlanner(repo);
    this.caseSelector = new CaseSelector(repo);
    this.attemptEvaluator = new AttemptEvaluator();
    this.diagnosticResolver = new DiagnosticResolver(repo);
    this.interventionPlanner = new InterventionPlanner(repo);
    this.transferSelector = new TransferSelector(repo);
    this.masteryUpdater = new MasteryUpdater();
    this.nextActionPolicy = new NextActionPolicy(repo);
  }

  public async startSession(request: SessionPlanRequest): Promise<PBLSession> {
    if (!this.repo.isReady()) await this.repo.init();
    return this.sessionPlanner.createSession(request);
  }

  public async prepareReattempt(session: PBLSession): Promise<PBLSession> {
    const attemptedQuestionRefs = session.attempts
      .filter((attempt) => attempt.competencyRef === session.currentCompetencyRef)
      .map((attempt) => attempt.questionRef);
    const lastAttempt = session.attempts[session.attempts.length - 1];
    const poolSelector = new QuestionPoolSelector(this.repo);
    const recentlyExposedQuestionRefs = getRecentQuestionEncounterRefs(session.userId, {
      excludeSessionId: session.sessionId,
    });
    const freshExclusions = [...new Set([
      ...attemptedQuestionRefs,
      ...recentlyExposedQuestionRefs,
    ])];
    const recentExposureFingerprints = await poolSelector.getPromptFingerprints(
      recentlyExposedQuestionRefs
    );
    let validationCandidate = await poolSelector.selectQuestion(
      session.currentCompetencyRef,
      'validation',
      {
          excludedQuestionRefs: freshExclusions,
          excludedPromptFingerprints: [...recentExposureFingerprints],
          onlineOnly: true,
        seed: session.sessionId,
      }
    );
    let recentExposureFallback = false;
    if (!validationCandidate && recentlyExposedQuestionRefs.length > 0) {
      validationCandidate = await poolSelector.selectQuestion(
        session.currentCompetencyRef,
        'validation',
        {
          excludedQuestionRefs: attemptedQuestionRefs,
          onlineOnly: true,
          seed: `${session.sessionId}:recent-reuse`,
        }
      );
      recentExposureFallback = Boolean(validationCandidate);
    }
    const item = validationCandidate
      ? {
          ...poolSelector.toTransferItem(validationCandidate, 'isomorphic', 1),
          recentExposureFallback,
        }
      : await this.transferSelector.selectNextTransferItem(
          session.currentCompetencyRef,
          lastAttempt?.evaluation || 'error',
          0,
          session.masterySnapshot[session.currentCompetencyRef],
          attemptedQuestionRefs,
          true,
          session.sessionId,
          recentlyExposedQuestionRefs
        );
    if (!item) throw new Error('Não há questão isomórfica publicada para a nova tentativa.');
    session.currentTransferItem = item;
    session.currentQuestionRef = item.officialQuestionRef;
    session.currentTransferItemIndex = 0;
    session.phase = 'reattempt';
    session.pendingNextAction = undefined;
    session.lastFeedbackMessage = undefined;
    session.updatedAt = new Date().toISOString();
    return session;
  }

  public async prepareTransfer(session: PBLSession): Promise<PBLSession> {
    // 1. Motor policy & Terminal action check (RGO-005):
    // Se há uma ação pendente terminal (complete_session, advance_competency ou outcome === 'needs_review'),
    // a decisão do motor DEVE ser preservada e direcionada para reflexão/finalização, sem ser sobrescrita.
    const pendingAction = session.pendingNextAction;
    const isTerminalAction = Boolean(
      pendingAction && (
        pendingAction.type === 'complete_session' ||
        pendingAction.type === 'advance_competency' ||
        pendingAction.outcome === 'needs_review'
      )
    );

    // Verificação de orçamento / limite de tempo da sessão
    const isBudgetExhausted = Boolean(
      session.sessionBudgetMs && (session.wallTimeMs || 0) >= session.sessionBudgetMs
    );

    if (isTerminalAction || isBudgetExhausted) {
      session.phase = 'reflection';
      session.currentTransferItem = undefined;
      session.lastFeedbackMessage = isBudgetExhausted
        ? 'Tempo limite da sessão atingido. Avançando para consolidação e reflexão.'
        : (pendingAction?.feedbackMessage || 'Sessão direcionada para consolidação e reflexão pelo motor pedagógico.');
      session.updatedAt = new Date().toISOString();
      return session;
    }

    // 2. Exclusões abrangentes (RGO-005):
    // - Questões já respondidas nesta competência nesta sessão
    const attemptedQuestionRefs = session.attempts
      .filter((attempt) => attempt.competencyRef === session.currentCompetencyRef)
      .map((attempt) => attempt.questionRef);

    // - Questões recentemente expostas de outras sessões
    const recentlyExposedQuestionRefs = getRecentQuestionEncounterRefs(session.userId, {
      excludeSessionId: session.sessionId,
    });

    // - Questão atual explicada/ativa (mesmo se ainda sem tentativa oficial gravada no episódio)
    const sessionExposedRefs = new Set<string>(attemptedQuestionRefs);
    if (session.currentQuestionRef) {
      sessionExposedRefs.add(session.currentQuestionRef);
    }
    // - Questões dos episódios de tutoria e intervenções da sessão
    if (session.tutorEpisodes) {
      for (const episode of Object.values(session.tutorEpisodes)) {
        if (episode.questionRef) sessionExposedRefs.add(episode.questionRef);
      }
    }
    if (session.savedErrorQuestionRefs) {
      for (const ref of session.savedErrorQuestionRefs) {
        sessionExposedRefs.add(ref);
      }
    }

    const lastAttempt = session.attempts[session.attempts.length - 1];

    const item = await this.transferSelector.selectNextTransferItem(
      session.currentCompetencyRef,
      lastAttempt?.evaluation || 'error',
      session.currentTransferItemIndex,
      session.masterySnapshot[session.currentCompetencyRef],
      Array.from(sessionExposedRefs),
      true,
      session.sessionId,
      recentlyExposedQuestionRefs
    );

    if (item) {
      session.currentTransferItem = item;
      session.currentQuestionRef = item.officialQuestionRef;
      session.phase = 'transfer';
      session.pendingNextAction = undefined;
      session.lastFeedbackMessage = undefined;
    } else {
      session.currentTransferItem = undefined;
      session.phase = 'reflection';
      session.pendingNextAction = undefined;
      // Mensagem precisa e contextual (evita alegar que todas foram concluídas quando o pool está indisponível/vazio)
      session.lastFeedbackMessage = attemptedQuestionRefs.length > 0
        ? 'Transferência concluída para as questões disponíveis desta competência.'
        : 'Não há questões adicionais de transferência disponíveis no momento para esta competência.';
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  public continueAfterDiagnostic(session: PBLSession): PBLSession {
    const action = session.pendingNextAction;
    if (!action) return session;
    if (action.type === 'request_probe') session.phase = 'hypothesis';
    else if (action.type === 'trigger_intervention') session.phase = 'intervention';
    else if (action.type === 'request_transfer') session.phase = 'transfer';
    else if (action.type === 'branch_to_prerequisite' && action.targetCompetencyRef) {
      const existingIndex = session.targetCompetencyRefs.indexOf(action.targetCompetencyRef);
      if (existingIndex >= 0) {
        session.targetCompetencyRefs.splice(existingIndex, 1);
        if (existingIndex < session.currentCompetencyIndex) {
          session.currentCompetencyIndex -= 1;
        }
      }
      session.targetCompetencyRefs.splice(session.currentCompetencyIndex, 0, action.targetCompetencyRef);
      session.currentCompetencyRef = action.targetCompetencyRef;
      session.currentCaseRef = action.targetCaseRef || session.currentCaseRef;
      session.currentQuestionRef = action.targetQuestionRef || session.currentQuestionRef;
      session.currentTransferItemIndex = 0;
      session.currentTransferItem = undefined;
      session.pendingNextAction = undefined;
      session.lastFeedbackMessage = 'Reforço de pré-requisito antes de retomar o problema principal.';
      session.lastDiagnosticResult = undefined;
      session.lastInterventionPayload = undefined;
      session.phase = 'problem';
    }
    else if (action.type === 'advance_competency' || action.type === 'complete_session') {
      session.phase = 'reflection';
    }
    session.updatedAt = new Date().toISOString();
    return session;
  }

  public completeReflection(session: PBLSession, reflection: PBLReflectionSubmission): PBLSession {
    const action = session.pendingNextAction;
    if (!action || (action.type !== 'advance_competency' && action.type !== 'complete_session')) {
      return session;
    }
    const studentNote = reflection.note?.trim() || '';
    const note = studentNote
      ? studentNote
      : reflection.decision === 'needs_review'
        ? 'Solicitada revisão para esta competência.'
        : reflection.decision === 'suggested_rule'
          ? reflection.suggestedRule.trim()
          : '';
    session.reflectionNotes = {
      ...(session.reflectionNotes || {}),
      [session.currentCompetencyRef]: note,
    };
    session.reflectionEntries = {
      ...(session.reflectionEntries || {}),
      [session.currentCompetencyRef]: {
        decision: reflection.decision,
        note,
        suggestedRule: reflection.suggestedRule.trim(),
        createdAt: new Date().toISOString(),
      },
    };
    const finalOutcome: PBLCompetencyOutcome = reflection.decision === 'needs_review'
      ? 'needs_review'
      : action.outcome === 'mastered'
        ? 'transfer_confirmed'
        : action.outcome || 'needs_review';
    session.competencyOutcomes = {
      ...(session.competencyOutcomes || {}),
      [session.currentCompetencyRef]: finalOutcome,
    };
    session.reflectionEntries[session.currentCompetencyRef] = {
      ...session.reflectionEntries[session.currentCompetencyRef],
      assistanceUsed: reflection.assistanceUsed,
      revealedSuggestedRule: reflection.revealedSuggestedRule,
    };
    const currentMastery = session.masterySnapshot[session.currentCompetencyRef];
    if (currentMastery) {
      let finalizedMastery = this.masteryUpdater.applyOutcome(currentMastery, finalOutcome);
      if (finalOutcome !== 'needs_review') {
        const confirmedRefs = new Set(
          session.attempts
            .filter((attempt) => attempt.competencyRef === session.currentCompetencyRef)
            .flatMap((attempt) => attempt.detectedMisconceptionRefs)
        );
        finalizedMastery = {
          ...finalizedMastery,
          activeMisconceptions: finalizedMastery.activeMisconceptions.filter(
            (misconceptionRef) => !confirmedRefs.has(misconceptionRef)
          ),
          resolvedMisconceptions: Array.from(new Set([
            ...finalizedMastery.resolvedMisconceptions,
            ...confirmedRefs,
          ])),
        };
      }
      session.masterySnapshot[session.currentCompetencyRef] = finalizedMastery;
    }
    if (session.reflectionDrafts) delete session.reflectionDrafts[session.currentCompetencyRef];
    this.applyTerminalAction(session, action);
    session.updatedAt = new Date().toISOString();
    return session;
  }

  public async submitAttempt(
    session: PBLSession,
    attemptParams: EvaluateAttemptParams
  ): Promise<{
    session: PBLSession;
    attempt: PBLAttempt;
    diagnostic?: DiagnosticResult;
    intervention?: InterventionPayload;
    nextAction: NextActionDecision;
  }> {
    const priorMastery = session.masterySnapshot[attemptParams.competencyRef];
    const priorPracticeAt = priorMastery?.lastPracticedAt
      ? Date.parse(priorMastery.lastPracticedAt)
      : Number.NaN;
    const elapsedSinceLastPracticeMs = Number.isFinite(priorPracticeAt)
      ? Math.max(0, Date.now() - priorPracticeAt)
      : undefined;
    const qualifiesAsDelayedRetrieval =
      session.mode === 'review'
      && attemptParams.stage === 'initial'
      && (elapsedSinceLastPracticeMs || 0) >= 20 * 60 * 60 * 1000
      && attemptParams.isDelayedRetrieval !== false;
    const attempt = this.attemptEvaluator.evaluate({
      ...attemptParams,
      assistanceLevel: maximumAssistance(
        attemptParams.assistanceLevel ?? session.interventionAssistance?.[attemptParams.competencyRef],
        ...Object.values(session.tutorEpisodes || {}).filter((episode) => episode.questionRef === attemptParams.questionRef).map((episode) => episode.assistanceLevel)
      ),
      // O runtime não aceita um sinal positivo autorrelatado como prova de
      // espaçamento: a janela precisa ser sustentada pelo timestamp persistido.
      isDelayedRetrieval: qualifiesAsDelayedRetrieval,
      elapsedSinceLastPracticeMs,
    });
    if (attempt.stage === 'transfer') {
      attempt.transferValidationStatus = session.currentTransferItem?.validationStatus || 'unverified';
    }
    if (attempt.assistanceLevel !== 'none' && session.lastInterventionPayload) {
      attempt.interventionRefs = [session.lastInterventionPayload.interventionId];
    }
    let diagnostic: DiagnosticResult | undefined;
    let intervention: InterventionPayload | undefined;

    if (!attempt.isCorrect || attempt.evaluation === 'fragile_correct') {
      const previousDiagnostic = attempt.stage === 'probe'
        ? session.lastDiagnosticResult
        : undefined;
      diagnostic = await this.diagnosticResolver.resolveDiagnostic(attempt, previousDiagnostic);
      if (attempt.stage === 'probe' || attempt.stage === 'reattempt') {
        diagnostic.needsProbe = false;
        diagnostic.probeQuestionRef = undefined;
      }
      attempt.detectedTrapRefs = [...diagnostic.trapRefs];
      attempt.detectedMisconceptionRefs = [...diagnostic.misconceptionRefs];
      session.lastDiagnosticResult = diagnostic;
      // Não revelar a explicação antes da sondagem que deve testar a
      // hipótese; isso contaminaria a confirmação com assistência.
      if (!diagnostic.needsProbe) {
        const pblCase = await this.caseSelector.selectAnchorCase(attempt.competencyRef);
        if (pblCase) {
          intervention = await this.interventionPlanner.planIntervention(diagnostic, pblCase);
          session.lastInterventionPayload = intervention;
        }
      } else {
        session.lastInterventionPayload = undefined;
      }
    } else if (attempt.stage === 'probe' && session.lastDiagnosticResult) {
      session.lastDiagnosticResult = {
        ...session.lastDiagnosticResult,
        diagnosisKind: 'slip',
        needsProbe: false,
        probeQuestionRef: undefined,
        misconceptionRefs: [],
        candidateMisconceptionRefs: [],
        trapRefs: [],
        diagnosticConfidence: 0.40,
        diagnosticSummary: 'A sondagem independente não reproduziu o mecanismo; a hipótese inicial foi descartada.',
      };
    } else if (attempt.stage === 'reattempt' && attempt.isCorrect) {
      session.lastDiagnosticResult = undefined;
    }

    session.attempts.push(attempt);

    if (attempt.stage !== 'probe') {
      const prevMastery = session.masterySnapshot[attempt.competencyRef];
      const comp = await this.repo.getCompetency(attempt.competencyRef);
      const updatedMastery = this.masteryUpdater.updateMastery(
        prevMastery,
        {
          competencyId: attempt.competencyRef,
          isCorrect: attempt.isCorrect,
          confidence: attempt.confidence,
          stage: attempt.stage,
          transferType: attempt.transferType,
          transferValidationStatus: attempt.transferValidationStatus,
          hasMisconception: attempt.detectedMisconceptionRefs.length > 0,
          assistanceLevel: attempt.assistanceLevel,
          isDelayedRetrieval: attempt.isDelayedRetrieval,
          elapsedSinceLastPracticeMs: attempt.elapsedSinceLastPracticeMs,
          diagnosisKind: diagnostic?.diagnosisKind,
        },
        comp?.unitId,
        comp?.lessonId
      );
      if (diagnostic?.diagnosisKind === 'mapped_misconception') {
        updatedMastery.activeMisconceptions = Array.from(new Set([
          ...(updatedMastery.activeMisconceptions || []),
          ...attempt.detectedMisconceptionRefs,
        ]));
      }
      session.masterySnapshot[attempt.competencyRef] = updatedMastery;
    }

    const recentlyExposedQuestionRefs = getRecentQuestionEncounterRefs(session.userId, {
      excludeSessionId: session.sessionId,
    });
    let nextAction = await this.nextActionPolicy.decideNextAction(
      session,
      attempt,
      recentlyExposedQuestionRefs
    );
    if (
      attempt.stage === 'initial'
      && diagnostic?.needsProbe
      && diagnostic.probeQuestionRef
      && nextAction.type !== 'advance_competency'
      && nextAction.type !== 'complete_session'
    ) {
      nextAction = {
        type: 'request_probe',
        targetCompetencyRef: attempt.competencyRef,
        targetQuestionRef: diagnostic.probeQuestionRef,
        reason: diagnostic.diagnosisKind === 'mapped_error_hypothesis'
          ? 'A alternativa sugere um mecanismo causal, mas uma resposta isolada não o confirma.'
          : 'O primeiro erro não permitiu identificar a causa com segurança.',
        feedbackMessage: 'Antes da explicação, responda sem ajuda a uma questão curta que discrimina a hipótese.',
      };
    }
    if (
      (attempt.stage === 'initial' || attempt.stage === 'probe')
      && !attempt.isCorrect
      && diagnostic?.diagnosisKind === 'prerequisite_deficit'
      && diagnostic.prerequisiteCompetencyRef
      && nextAction.type !== 'advance_competency'
      && nextAction.type !== 'complete_session'
      && !session.attempts.some((candidate) =>
        candidate.competencyRef === diagnostic?.prerequisiteCompetencyRef
      )
    ) {
      const prerequisiteRef = diagnostic.prerequisiteCompetencyRef;
      const [prerequisiteCase, prerequisiteAnchor] = await Promise.all([
        this.repo.getCaseForCompetency(prerequisiteRef),
        new QuestionPoolSelector(this.repo).selectQuestion(prerequisiteRef, 'anchor', {
          seed: `${session.sessionId}:prerequisite`,
        }),
      ]);
      if (prerequisiteCase && prerequisiteAnchor) {
        nextAction = {
          type: 'branch_to_prerequisite',
          targetCompetencyRef: prerequisiteRef,
          targetCaseRef: prerequisiteCase.caseId,
          targetQuestionRef: prerequisiteAnchor.questionRef,
          reason: 'A sondagem confirmou um déficit de pré-requisito necessário.',
          feedbackMessage: 'Antes de retomar o problema, vamos recuperar o pré-requisito decisivo.',
        };
      }
    }

    session.pendingNextAction = nextAction;
    session.lastFeedbackMessage = nextAction.feedbackMessage;
    if (nextAction.targetQuestionRef) session.currentQuestionRef = nextAction.targetQuestionRef;
    if (nextAction.transferItem) session.currentTransferItem = nextAction.transferItem;

    if (attempt.stage === 'transfer') {
      if (!attempt.isCorrect || attempt.evaluation === 'fragile_correct') {
        if (nextAction.type === 'request_transfer') session.currentTransferItemIndex += 1;
        if (session.conductionMode === 'tutor') {
          session.phase = 'tutor';
          this.startTutorEpisode(session, {
            questionRef: attempt.questionRef,
            competencyRef: attempt.competencyRef,
            attemptStage: attempt.stage,
            initialUserAnswer: attempt.userAnswer,
            initialConfidence: attempt.confidence,
          });
        } else {
          session.phase = 'diagnostic';
        }
      } else if (nextAction.type === 'request_transfer') {
        session.currentTransferItemIndex += 1;
        session.phase = 'transfer';
      } else {
        session.phase = 'reflection';
      }
    } else {
      if (!attempt.isCorrect || attempt.evaluation === 'fragile_correct') {
        if (session.conductionMode === 'tutor') {
          session.phase = 'tutor';
          this.startTutorEpisode(session, {
            questionRef: attempt.questionRef,
            competencyRef: attempt.competencyRef,
            attemptStage: attempt.stage,
            initialUserAnswer: attempt.userAnswer,
            initialConfidence: attempt.confidence,
          });
        } else {
          session.phase = 'diagnostic';
        }
      } else {
        if (session.conductionMode === 'tutor') {
          if (nextAction.type === 'request_transfer') {
            session.phase = 'transfer';
          } else if (nextAction.type === 'advance_competency' || nextAction.type === 'complete_session') {
            session.phase = 'reflection';
          } else {
            session.phase = 'diagnostic';
          }
        } else {
          session.phase = 'diagnostic';
        }
      }
    }

    if (attempt.stage === 'reattempt') {
      session.interventionAssistance = {
        ...(session.interventionAssistance || {}),
        [attempt.competencyRef]: 'none',
      };
    }

    this.recalculateStats(session, attempt.responseTimeMs);
    session.updatedAt = new Date().toISOString();
    return { session, attempt, diagnostic, intervention, nextAction };
  }

  private applyTerminalAction(session: PBLSession, action: NextActionDecision): void {
    if (action.type === 'advance_competency') {
      session.currentCompetencyIndex += 1;
      session.currentCompetencyRef = action.targetCompetencyRef || session.currentCompetencyRef;
      session.currentCaseRef = action.targetCaseRef || session.currentCaseRef;
      session.currentQuestionRef = action.targetQuestionRef || session.currentQuestionRef;
      session.currentTransferItemIndex = 0;
      session.currentTransferItem = undefined;
      session.pendingNextAction = undefined;
      session.lastDiagnosticResult = undefined;
      session.lastInterventionPayload = undefined;
      session.lastFeedbackMessage = undefined;
      session.phase = 'problem';
      return;
    }
    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.pendingNextAction = undefined;
    session.phase = 'completed';
  }

  private recalculateStats(session: PBLSession, responseTimeMs: number): void {
    const accuracy = (stage: PBLAttempt['stage']): number => {
      const attempts = session.attempts.filter((attempt) => attempt.stage === stage);
      return attempts.length
        ? Math.round((attempts.filter((attempt) => attempt.isCorrect).length / attempts.length) * 100)
        : 0;
    };
    session.sessionStats.initialAccuracy = accuracy('initial');
    session.sessionStats.postInterventionAccuracy = accuracy('reattempt');
    session.sessionStats.transferRate = accuracy('transfer');
    session.sessionStats.misconceptionsCaught = new Set(
      session.attempts.flatMap((attempt) => attempt.detectedMisconceptionRefs)
    ).size;
    session.sessionStats.totalTimeMs += Math.max(0, responseTimeMs);
  }

  public startTutorEpisode(
    session: PBLSession,
    params: {
      questionRef: string;
      competencyRef: string;
      attemptStage: PBLAttemptStage;
      initialUserAnswer?: string;
      initialConfidence?: PBLConfidenceLevel;
      assistanceRequested?: boolean;
    }
  ): PBLTutorEpisode {
    const episodeId = `ep_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const assistanceLevel = maximumAssistance(session.interventionAssistance?.[params.competencyRef], params.assistanceRequested ? 'hint' : 'none');
    const attempt = params.initialUserAnswer ? [...session.attempts].reverse().find((item) =>
      item.questionRef === params.questionRef && item.competencyRef === params.competencyRef &&
      item.stage === params.attemptStage && item.userAnswer === params.initialUserAnswer) : undefined;

    if (params.assistanceRequested) {
      session.interventionAssistance = {
        ...(session.interventionAssistance || {}),
        [params.competencyRef]: assistanceLevel,
      };
    }

    const diagnostic = attempt && session.lastDiagnosticResult?.questionRef === attempt.questionRef
      && session.lastDiagnosticResult.competencyRef === attempt.competencyRef ? session.lastDiagnosticResult : undefined;
    const episode: PBLTutorEpisode = {
      episodeId,
      sessionId: session.sessionId,
      competencyRef: params.competencyRef,
      questionRef: params.questionRef,
      attemptStage: params.attemptStage,
      attemptId: attempt?.attemptId,
      diagnostic,
      intervention: diagnostic ? session.lastInterventionPayload : undefined,
      initialUserAnswer: attempt?.userAnswer,
      initialConfidence: params.initialConfidence,
      assistanceLevel,
      startedAt: now,
      updatedAt: now,
      turns: [],
      resolved: false,
      totalAiLatencyMs: 0,
    };

    session.tutorEpisodes = {
      ...(session.tutorEpisodes || {}),
      [episodeId]: episode,
    };
    session.currentTutorEpisodeId = episodeId;
    session.phase = 'tutor';
    session.updatedAt = now;
    return episode;
  }

  public recordTutorAssistance(session: PBLSession, episodeId: string, level: PBLAssistanceLevel): PBLSession {
    const episode = session.tutorEpisodes?.[episodeId];
    if (!episode || episode.resolved) return session;
    episode.assistanceLevel = maximumAssistance(episode.assistanceLevel, level);
    session.interventionAssistance = {
      ...session.interventionAssistance,
      [episode.competencyRef]: maximumAssistance(session.interventionAssistance?.[episode.competencyRef], episode.assistanceLevel),
    };
    episode.updatedAt = session.updatedAt = new Date().toISOString();
    return session;
  }

  public recordTutorTurn(
    session: PBLSession,
    episodeId: string,
    turn: PBLTutorTurn
  ): PBLSession {
    const episode = session.tutorEpisodes?.[episodeId];
    if (!episode || episode.resolved) return session;

    const isDuplicateTurn =
      episode.turns.some((existing) => existing.turnId === turn.turnId) ||
      (episode.turns.length > 0 &&
        episode.turns[episode.turns.length - 1].role === turn.role &&
        episode.turns[episode.turns.length - 1].content.trim() === turn.content.trim());
    if (isDuplicateTurn) return session;

    episode.turns.push(turn);
    episode.updatedAt = new Date().toISOString();

    if (turn.studentAssistanceRequested) {
      this.recordTutorAssistance(session, episodeId, 'partial');
    }

    if (turn.notebookDraft) {
      episode.notebookDraft = turn.notebookDraft;
    }

    if (turn.executionMetadata?.durationMs) {
      episode.totalAiLatencyMs += turn.executionMetadata.durationMs;
      session = deductPBLSessionWaitTime(session, turn.executionMetadata.durationMs);
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }

  public async concludeTutorEpisode(
    session: PBLSession,
    episodeId: string,
    action: 'try_same' | 'try_alternative' | 'proceed_transfer' | 'proceed_reflection'
  ): Promise<PBLSession> {
    const episode = session.tutorEpisodes?.[episodeId];
    if (episode) {
      episode.resolved = true;
      episode.updatedAt = new Date().toISOString();
    }

    if (action === 'try_same' && episode) {
      session.currentQuestionRef = episode.questionRef;
      if (episode?.attemptStage === 'transfer') {
        session.phase = 'transfer';
      } else if (episode?.attemptStage === 'probe') {
        session.phase = 'hypothesis';
      } else if (episode?.attemptStage === 'reattempt') {
        session.phase = 'reattempt';
      } else {
        session.phase = 'problem';
      }
    } else if (action === 'try_alternative') {
      return this.prepareReattempt(session);
    } else if (action === 'proceed_transfer') {
      return this.prepareTransfer(session);
    } else if (action === 'proceed_reflection') {
      if (!['complete_session', 'advance_competency'].includes(session.pendingNextAction?.type || '')) {
        session.pendingNextAction = {
          type: session.currentCompetencyIndex + 1 < session.targetCompetencyRefs.length ? 'advance_competency' : 'complete_session',
          outcome: 'needs_review',
          reason: 'O aluno encerrou o apoio antes de confirmar nova aplicação independente.',
        };
      }
      session.phase = 'reflection';
    }

    session.updatedAt = new Date().toISOString();
    return session;
  }
}

export const pblEngine = new PBLEngine();
