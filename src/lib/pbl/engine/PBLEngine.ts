import type {
  PBLSession,
  PBLAttempt,
  DiagnosticResult,
  InterventionPayload,
  NextActionDecision,
  PBLReflectionDecision,
  PBLCompetencyOutcome,
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
    const validationCandidate = await poolSelector.selectQuestion(
      session.currentCompetencyRef,
      'validation',
      {
        excludedQuestionRefs: attemptedQuestionRefs,
        onlineOnly: true,
        seed: session.sessionId,
      }
    );
    const item = validationCandidate
      ? poolSelector.toTransferItem(validationCandidate, 'isomorphic', 1)
      : await this.transferSelector.selectNextTransferItem(
          session.currentCompetencyRef,
          lastAttempt?.evaluation || 'error',
          0,
          session.masterySnapshot[session.currentCompetencyRef],
          attemptedQuestionRefs,
          true,
          session.sessionId
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
    const note = reflection.decision === 'needs_review'
      ? 'Ainda não consigo formular a regra; encaminhar para revisão.'
      : reflection.decision === 'suggested_rule'
        ? reflection.suggestedRule.trim()
        : reflection.note.trim();
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
      assistanceLevel: attemptParams.assistanceLevel
        || session.interventionAssistance?.[attemptParams.competencyRef]
        || 'none',
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
      if (attempt.stage === 'probe') {
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

    let nextAction = await this.nextActionPolicy.decideNextAction(session, attempt);
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
        session.phase = 'diagnostic';
      } else if (nextAction.type === 'request_transfer') {
        session.currentTransferItemIndex += 1;
        session.phase = 'transfer';
      } else {
        session.phase = 'reflection';
      }
    } else {
      session.phase = 'diagnostic';
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
}

export const pblEngine = new PBLEngine();
