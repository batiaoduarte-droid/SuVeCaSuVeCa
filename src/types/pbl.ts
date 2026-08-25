/**
 * SuVeCa Problem-Based Learning (PBL) Types & Domain Models
 * Schema v3.0.0 Compatible
 */

export interface PBLCompetency {
  schemaVersion: string;
  competencyId: string;
  lessonId: string;
  unitId: string;
  canonicalTopicId?: string;
  title: string;
  description: string;
  pedagogicalDomain: string;
  bloomLevel: string;
  learningObjectiveRefs: string[];
  conceptRefs: string[];
  ruleRefs: string[];
  procedureRefs: string[];
  contrastRefs: string[];
  examTrapRefs: string[];
  misconceptionRefs: string[];
  prerequisiteCompetencyRefs: string[];
  eligibleQuestionRefs: string[];
  anchorCandidateRefs: string[];
  diagnosticCandidateRefs: string[];
  transferCandidateRefs: string[];
  validationCandidateRefs: string[];
  questionCount: number;
}

export interface QuestionDistractor {
  label: string;
  optionText: string;
  isCorrect: boolean;
  criterionOrRuleRef?: string | null;
  errorPattern?: string;
  triggeredTrapRef?: string | null;
  likelyMisconceptionRef?: string | null;
  refutation: string;
}

export interface SolutionStrategyStep {
  stepNumber: number;
  action: string;
  rationale: string;
  appliedRuleRef?: string | null;
  procedureStepRef?: string;
}

export interface QuestionPedagogy {
  schemaVersion: string;
  questionPedagogyId: string;
  officialQuestionRef: string;
  lessonId: string;
  primaryUnitRef: string;
  allUnitRefs: string[];
  targetLearningObjectiveRefs: string[];
  testedConceptRefs: string[];
  primaryDecisiveRuleRef?: string | null;
  decisiveRuleRefs: string[];
  supportingRuleRefs: string[];
  procedureRefs: string[];
  contrastRefs: string[];
  examTrapRefs: string[];
  misconceptionRefs: string[];
  prerequisiteRefs: string[];
  difficulty: 'facil' | 'medio' | 'dificil';
  cognitiveDemand: string;
  solutionStrategy: SolutionStrategyStep[];
  distractorAnalysis: QuestionDistractor[];
  errorDiagnosticPotential: {
    score: number;
    diagnosable: boolean;
    likelyTrapRefs: string[];
    likelyMisconceptionRefs: string[];
    diagnosticDiscriminator: string;
  };
  pblSuitability: {
    anchor: number;
    diagnostic: number;
    transfer: number;
    validation: number;
    primaryRole: 'anchor' | 'diagnostic' | 'transfer' | 'validation';
  };
  provenance?: {
    sourceQuestionRef: string;
    semanticOrigin: string;
    enrichedAt: string;
  };
}

export interface QuestionCompetencyLink {
  schemaVersion: string;
  linkId: string;
  officialQuestionRef: string;
  competencyId: string;
  unitId: string;
  lessonId: string;
  primaryLearningObjectiveRef?: string | null;
  primaryDecisiveRuleRef?: string | null;
  primaryProcedureRef?: string | null;
  primaryTrapRef?: string | null;
  primaryMisconceptionRef?: string | null;
  prerequisiteRefs: string[];
  pblSuitabilityScores: {
    anchor: number;
    diagnostic: number;
    transfer: number;
    validation: number;
    primaryRole: string;
  };
  assignedPBLRole: string;
  diagnosticPotential: number;
}

export interface PBLCase {
  schemaVersion: string;
  caseId: string;
  competencyRef: string;
  unitRef: string;
  canonicalTopicRef?: string;
  title: string;
  pedagogicalRole: string;
  anchorQuestionRef: string;
  questionStem: string;
  options: Array<{ label: string; text: string }>;
  officialAnswer: string;
  learningObjectiveRefs: string[];
  targetConceptRefs: string[];
  primaryDecisiveRuleRef?: string | null;
  decisiveRuleRefs: string[];
  procedureRef: string;
  solutionStrategy: {
    stepByStepAlgorithm: string[];
    stoppingCondition: string;
    formulasOrRulesApplied: string[];
  };
  cognitiveDiagnostic: {
    primaryExamTrapRef?: string | null;
    associatedMisconceptionRef?: string | null;
    triggerCondition: string;
    errorPattern: string;
    correctiveGuidance: string;
    distractorBreakdown: Array<{
      option: string;
      text: string;
      isCorrect: boolean;
      misconceptionTriggered?: string | null;
      refutation: string;
    }>;
  };
  contrastingScaffold?: {
    contrastRef: string;
    distinctionKey: string;
    poleA: string;
    poleB: string;
  } | null;
  prerequisiteRefs: string[];
  transferSetRef: string;
  diagnosticPathRef: string;
  validationQuestionRefs: string[];
  editorialStatus?: {
    state: string;
    reviewerType: string;
    reviewedAt: string;
  };
}

export type TransferType =
  | 'isomorphic'
  | 'near_transfer'
  | 'boundary_case'
  | 'far_transfer'
  | 'inverted_transfer';

export interface PBLTransferItem {
  itemOrder: number;
  officialQuestionRef: string;
  transferType: TransferType;
  examBoard: string;
  year?: number;
  difficulty: 'facil' | 'medio' | 'dificil';
  cognitiveDelta: string;
  expectedObstacle: string;
}

export interface PBLQuestionPresentation {
  questionRef: string;
  questionType: 'multiple_choice' | 'true_false';
  supportText?: string;
  presentation?: QuestionPresentation;
  prompt: string;
  options: Array<{ label: string; text: string }>;
  correctAnswer: string;
  commentary?: string;
  examBoard?: string;
  organization?: string;
  year?: number;
}

export interface PBLTransferSet {
  schemaVersion: string;
  transferSetId: string;
  competencyRef: string;
  primaryCaseRef: string;
  targetSkill: string;
  targetConceptRefs: string[];
  decisiveRuleRef?: string | null;
  procedureRef: string;
  transferDimensions: string[];
  items: PBLTransferItem[];
  masteryCriteria: {
    minPassingScore: number;
    consecutiveCorrectRequired: number;
  };
}

export interface DiagnosticPathNode {
  nodeId: string;
  questionRef: string;
  nodeType: 'entry_probe' | 'trap_detector' | 'remediation_check';
  evaluatedPrerequisiteRef?: string | null;
  onCorrect: {
    nextAction: 'advance_to_node' | 'graduate_path';
    targetNodeId?: string | null;
    feedbackMessage: string;
  };
  onIncorrect: {
    detectedMisconceptionRef?: string | null;
    triggeredTrapRef?: string | null;
    remediationProcedureRef?: string | null;
    correctiveMicroLesson: string;
    nextAction: 'branch_to_prerequisite' | 'remedial_instruction';
    targetNodeId?: string | null;
  };
}

export interface PBLDiagnosticPath {
  schemaVersion: string;
  pathId: string;
  competencyRef: string;
  title: string;
  unitRef: string;
  targetConceptRef: string;
  entryNodeId: string;
  nodes: DiagnosticPathNode[];
  terminalOutcomes: Array<{
    outcomeId: string;
    masteryStatus: string;
    suggestedNextStep: string;
  }>;
}

export interface PBLCumulativeSession {
  schemaVersion: string;
  sessionId: string;
  unitId: string;
  lessonId: string;
  title: string;
  spiralProgressionLevel: number;
  coveredCurricularLessons: string[];
  integratedCompetencyRefs: string[];
  anchorPBLCaseRefs: string[];
  crossLessonTransferSetRefs: string[];
  activeReviewProtocols: string[];
  sessionGoal: string;
}

export interface PBLManifest {
  schemaVersion: string;
  manifestId: string;
  generatedAt: string;
  totalOfficialQuestionsCovered: number;
  totalQuestionPedagogy: number;
  totalCompetencies: number;
  totalPBLCases: number;
  totalTransferSets: number;
  totalDiagnosticPaths: number;
  totalCumulativeSessions: number;
  coverageSummary: {
    unitsCovered: number;
    unitsTotal: number;
    unitsCoveragePct: number;
    learningObjectivesCovered: number;
    learningObjectivesTotal: number;
    learningObjectivesCoveragePct: number;
    officialQuestionsCovered: number;
    officialQuestionsTotal: number;
    officialQuestionsCoveragePct: number;
  };
}

// ---------------------------------------------------------------------------
// SESSION, ATTEMPT & RUNTIME STATE MODELS
// ---------------------------------------------------------------------------

export type PBLSessionMode = 'guided' | 'diagnostic' | 'review' | 'cumulative';
export type PBLSessionStatus = 'active' | 'completed' | 'abandoned';
export type PBLSessionPhase =
  | 'problem'
  | 'hypothesis'
  | 'diagnostic'
  | 'intervention'
  | 'reattempt'
  | 'transfer'
  | 'reflection'
  | 'completed';

export type PBLAttemptStage = 'initial' | 'reattempt' | 'transfer' | 'probe';
export type PBLConfidenceLevel = 'guess' | 'low' | 'medium' | 'high';

export type ConfidenceEvaluation =
  | 'strong_correct'
  | 'fragile_correct'
  | 'high_confidence_error'
  | 'error';

export interface PBLAttempt {
  attemptId: string;
  sessionId: string;
  questionRef: string;
  competencyRef: string;
  stage: PBLAttemptStage;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  confidence: PBLConfidenceLevel;
  evaluation: ConfidenceEvaluation;
  reasoning?: string;
  responseTimeMs: number;
  detectedTrapRefs: string[];
  detectedMisconceptionRefs: string[];
  interventionRefs: string[];
  transferType?: TransferType;
  createdAt: string;
}

export type MasteryLevel = 'novice' | 'developing' | 'competent' | 'mastered' | 'expert';

export interface CompetencyMastery {
  competencyId: string;
  unitId: string;
  lessonId: string;
  score: number; // 0.0 to 1.0
  level: MasteryLevel;
  bktParams?: {
    pKnown: number;
    pTransit: number;
    pSlip: number;
    pGuess: number;
  };
  totalAttempts: number;
  correctAttempts: number;
  transferSuccessCount: number;
  activeMisconceptions: string[];
  resolvedMisconceptions: string[];
  lastPracticedAt: string;
  nextReviewRecommendedAt: string;
}

export interface DiagnosticResult {
  competencyRef: string;
  questionRef: string;
  evaluation: ConfidenceEvaluation;
  trapRefs: string[];
  misconceptionRefs: string[];
  prerequisiteCompetencyRef?: string | null;
  diagnosticConfidence: number; // 0.0 to 1.0
  needsProbe: boolean;
  probeQuestionRef?: string;
  diagnosticSummary?: string;
  trapSummary?: string;
  intervention: {
    microLesson?: string;
    ruleRefs: string[];
    procedureRefs: string[];
    contrastRefs: string[];
    refutationText?: string;
  };
}

export interface InterventionPayload {
  interventionId: string;
  competencyRef: string;
  misconceptionRef?: string | null;
  trapRef?: string | null;
  microLessonText: string;
  ruleTitle?: string;
  ruleStatement?: string;
  procedureSteps: string[];
  contrastingPoleA?: string;
  contrastingPoleB?: string;
  workedExample?: {
    stem: string;
    stepByStep: string[];
    resolution: string;
  };
}

export type PBLNextActionType =
  | 'present_problem'
  | 'show_diagnostic'
  | 'trigger_intervention'
  | 'request_reattempt'
  | 'request_probe'
  | 'request_transfer'
  | 'branch_to_prerequisite'
  | 'advance_competency'
  | 'complete_session';

export interface NextActionDecision {
  type: PBLNextActionType;
  targetCompetencyRef?: string;
  targetCaseRef?: string;
  targetQuestionRef?: string;
  transferItem?: PBLTransferItem;
  outcome?: PBLCompetencyOutcome;
  reason: string;
  feedbackMessage?: string;
}

export type PBLCompetencyOutcome = 'mastered' | 'needs_review';

export interface PBLSession {
  sessionId: string;
  userId: string;
  mode: PBLSessionMode;
  status: PBLSessionStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  targetCompetencyRefs: string[];
  currentCompetencyIndex: number;
  currentCompetencyRef: string;
  currentCaseRef: string;
  currentQuestionRef: string;
  phase: PBLSessionPhase;
  currentTransferItemIndex: number;
  currentTransferItem?: PBLTransferItem;
  pendingNextAction?: NextActionDecision;
  attempts: PBLAttempt[];
  masterySnapshot: Record<string, CompetencyMastery>;
  competencyOutcomes?: Record<string, PBLCompetencyOutcome>;
  reflectionNotes?: Record<string, string>;
  savedErrorQuestionRefs?: string[];
  lastFeedbackMessage?: string;
  lastDiagnosticResult?: DiagnosticResult;
  lastInterventionPayload?: InterventionPayload;
  sessionStats: {
    initialAccuracy: number;
    postInterventionAccuracy: number;
    transferRate: number;
    misconceptionsCaught: number;
    totalTimeMs: number;
  };
}

export type PBLEventType =
  | 'pbl_session_started'
  | 'pbl_initial_attempt'
  | 'pbl_diagnostic_triggered'
  | 'pbl_intervention_completed'
  | 'pbl_reattempt'
  | 'pbl_transfer_attempt'
  | 'pbl_competency_mastered'
  | 'pbl_session_completed';

export interface SessionEvent {
  eventId: string;
  eventType: PBLEventType;
  sessionId: string;
  userId: string;
  competencyRef?: string;
  questionRef?: string;
  timestamp: string;
  payload: Record<string, any>;
}

export interface MasteryEvidence {
  competencyId: string;
  isCorrect: boolean;
  confidence: PBLConfidenceLevel;
  stage: PBLAttemptStage;
  transferType?: TransferType;
  hasMisconception: boolean;
}

export interface MasteryModel {
  update(previous: CompetencyMastery, evidence: MasteryEvidence): CompetencyMastery;
}
import type { QuestionPresentation } from './questionPresentation';
