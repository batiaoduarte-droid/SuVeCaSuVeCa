import type {
  PBLSession,
  PBLAttempt,
  DiagnosticResult,
  InterventionPayload,
  NextActionDecision,
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
    else if (action.type === 'advance_competency' || action.type === 'complete_session') {
      session.phase = 'reflection';
    }
    session.updatedAt = new Date().toISOString();
    return session;
  }

  public completeReflection(session: PBLSession, reflection: string): PBLSession {
    const action = session.pendingNextAction;
    if (!action || (action.type !== 'advance_competency' && action.type !== 'complete_session')) {
      return session;
    }
    session.reflectionNotes = {
      ...(session.reflectionNotes || {}),
      [session.currentCompetencyRef]: reflection.trim(),
    };
    session.competencyOutcomes = {
      ...(session.competencyOutcomes || {}),
      [session.currentCompetencyRef]: action.outcome || 'needs_review',
    };
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
    const attempt = this.attemptEvaluator.evaluate(attemptParams);
    let diagnostic: DiagnosticResult | undefined;
    let intervention: InterventionPayload | undefined;

    if (!attempt.isCorrect || attempt.evaluation === 'fragile_correct') {
      diagnostic = await this.diagnosticResolver.resolveDiagnostic(attempt);
      if (attempt.stage === 'probe') {
        diagnostic.needsProbe = false;
        diagnostic.probeQuestionRef = undefined;
      }
      attempt.detectedTrapRefs = [...diagnostic.trapRefs];
      attempt.detectedMisconceptionRefs = [...diagnostic.misconceptionRefs];
      session.lastDiagnosticResult = diagnostic;
      const pblCase = await this.caseSelector.selectAnchorCase(attempt.competencyRef);
      if (pblCase) {
        intervention = await this.interventionPlanner.planIntervention(diagnostic, pblCase);
        session.lastInterventionPayload = intervention;
      }
    } else if (attempt.stage === 'probe' && session.lastDiagnosticResult) {
      session.lastDiagnosticResult = {
        ...session.lastDiagnosticResult,
        needsProbe: false,
        probeQuestionRef: undefined,
        diagnosticConfidence: Math.max(0.8, session.lastDiagnosticResult.diagnosticConfidence),
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
          hasMisconception: attempt.detectedMisconceptionRefs.length > 0,
        },
        comp?.unitId,
        comp?.lessonId
      );
      updatedMastery.activeMisconceptions = Array.from(new Set([
        ...(updatedMastery.activeMisconceptions || []),
        ...attempt.detectedMisconceptionRefs,
      ]));
      session.masterySnapshot[attempt.competencyRef] = updatedMastery;
    }

    let nextAction = await this.nextActionPolicy.decideNextAction(session, attempt);
    if (attempt.stage === 'initial' && diagnostic?.needsProbe && diagnostic.probeQuestionRef) {
      nextAction = {
        type: 'request_probe',
        targetCompetencyRef: attempt.competencyRef,
        targetQuestionRef: diagnostic.probeQuestionRef,
        reason: 'O primeiro erro não permitiu identificar a causa com segurança.',
        feedbackMessage: 'Antes da explicação, responda a uma questão curta de sondagem.',
      };
    }

    session.pendingNextAction = nextAction;
    session.lastFeedbackMessage = nextAction.feedbackMessage;
    if (nextAction.targetQuestionRef) session.currentQuestionRef = nextAction.targetQuestionRef;
    if (nextAction.transferItem) session.currentTransferItem = nextAction.transferItem;

    if (attempt.stage === 'transfer') {
      if (nextAction.type === 'request_transfer') {
        session.currentTransferItemIndex += 1;
        session.phase = 'transfer';
      } else {
        session.phase = 'reflection';
      }
    } else {
      session.phase = 'diagnostic';
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
