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
    if (!this.repo.isReady()) {
      await this.repo.init();
    }
    return this.sessionPlanner.createSession(request);
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
    // 1. Evaluate Attempt
    const attempt = this.attemptEvaluator.evaluate(attemptParams);
    session.attempts.push(attempt);

    // 2. Update Mastery
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
    session.masterySnapshot[attempt.competencyRef] = updatedMastery;

    // 3. Resolve Diagnostic if needed
    let diagnostic: DiagnosticResult | undefined;
    let intervention: InterventionPayload | undefined;

    if (!attempt.isCorrect || attempt.evaluation === 'fragile_correct') {
      diagnostic = await this.diagnosticResolver.resolveDiagnostic(attempt);
      session.lastDiagnosticResult = diagnostic;

      const pblCase = await this.caseSelector.selectAnchorCase(attempt.competencyRef);
      if (pblCase) {
        intervention = await this.interventionPlanner.planIntervention(diagnostic, pblCase);
        session.lastInterventionPayload = intervention;
      }
    }

    // 4. Decide Next Action Policy
    const nextAction = await this.nextActionPolicy.decideNextAction(session, attempt);

    // 5. Update Session Phase & State
    if (attempt.stage === 'initial') {
      session.phase = 'diagnostic';
      if (nextAction.targetQuestionRef) {
        session.currentQuestionRef = nextAction.targetQuestionRef;
      }
    } else if (nextAction.type === 'trigger_intervention') {
      session.phase = 'intervention';
    } else if (nextAction.type === 'request_reattempt') {
      session.phase = 'reattempt';
    } else if (nextAction.type === 'request_transfer') {
      session.phase = 'transfer';
      session.currentTransferItemIndex += 1;
      if (nextAction.targetQuestionRef) {
        session.currentQuestionRef = nextAction.targetQuestionRef;
      }
    } else if (nextAction.type === 'advance_competency') {
      session.currentCompetencyIndex += 1;
      session.currentCompetencyRef = nextAction.targetCompetencyRef || session.currentCompetencyRef;
      session.currentCaseRef = nextAction.targetCaseRef || session.currentCaseRef;
      session.currentQuestionRef = nextAction.targetQuestionRef || session.currentQuestionRef;
      session.currentTransferItemIndex = 0;
      session.phase = 'problem';
    } else if (nextAction.type === 'branch_to_prerequisite') {
      session.currentCompetencyRef = nextAction.targetCompetencyRef || session.currentCompetencyRef;
      const prereqCase = await this.caseSelector.selectAnchorCase(session.currentCompetencyRef);
      session.currentCaseRef = prereqCase?.caseId || session.currentCaseRef;
      session.currentQuestionRef = prereqCase?.anchorQuestionRef || session.currentQuestionRef;
      session.phase = 'problem';
    } else if (nextAction.type === 'complete_session') {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      session.phase = 'completed';
    }

    // 6. Recalculate Session Stats
    const initialAttempts = session.attempts.filter((a) => a.stage === 'initial');
    const correctInitial = initialAttempts.filter((a) => a.isCorrect).length;
    session.sessionStats.initialAccuracy =
      initialAttempts.length > 0 ? Math.round((correctInitial / initialAttempts.length) * 100) : 0;

    const reattempts = session.attempts.filter((a) => a.stage === 'reattempt');
    const correctReattempts = reattempts.filter((a) => a.isCorrect).length;
    session.sessionStats.postInterventionAccuracy =
      reattempts.length > 0 ? Math.round((correctReattempts / reattempts.length) * 100) : 0;

    const xfers = session.attempts.filter((a) => a.stage === 'transfer');
    const correctXfers = xfers.filter((a) => a.isCorrect).length;
    session.sessionStats.transferRate =
      xfers.length > 0 ? Math.round((correctXfers / xfers.length) * 100) : 0;

    session.sessionStats.totalTimeMs += attempt.responseTimeMs;
    session.updatedAt = new Date().toISOString();

    return {
      session,
      attempt,
      diagnostic,
      intervention,
      nextAction,
    };
  }
}

export const pblEngine = new PBLEngine();
