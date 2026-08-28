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
  causalErrorMechanisms?: PBLErrorMechanism[];
  causalDiagnosticCoverage?: {
    reviewedQuestionRefs: string[];
    causalOptionMappings: number;
    canonicalMisconceptions: number;
    mechanismOnlyMappings: number;
    policy: 'single_response_is_hypothesis';
    reviewedAt: string;
    availability?: 'ready' | 'feedback_only';
    reason?: string;
  };
  prerequisiteCompetencyRefs: string[];
  eligibleQuestionRefs: string[];
  anchorCandidateRefs: string[];
  diagnosticCandidateRefs: string[];
  transferCandidateRefs: string[];
  validationCandidateRefs: string[];
  questionCount: number;
  practiceCoverage?: {
    status: 'ready' | 'limited' | 'blocked';
    strength: 'minimum' | 'adequate' | 'robust';
    eligibleQuestions: number;
    distinctQuestions: number;
    primaryQuestions: number;
    secondaryQuestions: number;
    directQuestions: number;
    supportingQuestions: number;
    missingQuestionsForPractice: number;
    anchorCandidates: number;
    transferCandidates: number;
    auditedTransferCandidates?: number;
    unverifiedTransferCandidates?: number;
    validationCandidates: number;
    gapType: 'none' | 'content' | 'semantic_validation' | 'transfer_evidence';
    limitationReason?: string;
    reason?: string;
    auditedAt: string;
  };
}

export type PBLSemanticReviewStatus = 'approved' | 'blocked' | 'pending';

export type PBLQuestionRole = 'anchor' | 'diagnostic' | 'transfer' | 'validation';

export type PBLAssignmentReviewMethod =
  | 'editorial'
  | 'source_taxonomy'
  | 'canonical_topic'
  | 'reviewed_topic_family';

export interface PBLSemanticReview {
  status: PBLSemanticReviewStatus;
  reviewedAt: string;
  reason: string;
  evidenceRefs?: string[];
}

/**
 * Atomic, fail-closed authorization for using one official question in one
 * competency. Physical/source ownership remains in QuestionCompetencyLink;
 * this assignment records every approved or rejected semantic destination.
 */
export interface QuestionCompetencyAssignment {
  assignmentId: string;
  competencyId: string;
  unitId: string;
  lessonId: string;
  relation: 'primary' | 'secondary';
  alignment?: 'direct' | 'supporting';
  semanticStatus: PBLSemanticReviewStatus;
  allowedRoles: PBLQuestionRole[];
  roleScores: Record<PBLQuestionRole, number>;
  evidenceRefs: string[];
  reviewMethod: PBLAssignmentReviewMethod;
  reviewedAt: string;
  reason: string;
}

export interface QuestionDistractor {
  label: string;
  optionText?: string;
  isCorrect?: boolean;
  /**
   * Dialeto editorial usado por parte do banco online. O runtime deve
   * normalizá-lo como feedback genérico, nunca como misconception comprovada.
   */
  analysis?: string;
  criterionOrRuleRef?: string | null;
  errorPattern?: string;
  triggeredTrapRef?: string | null;
  likelyMisconceptionRef?: string | null;
  refutation?: string;
  causalStatus?: 'causal_candidate' | 'feedback_only';
  errorMechanism?: PBLErrorMechanism | null;
  mappingConfidence?: number;
  mappingEvidence?: string;
}

export type PBLErrorMechanism =
  | 'rule_overgeneralization'
  | 'rule_omission'
  | 'condition_ignored'
  | 'category_confusion'
  | 'polarity_inversion'
  | 'surface_attractor'
  | 'invalid_inference'
  | 'incomplete_analysis'
  | 'calculation_or_counting_error'
  | 'reading_misinterpretation';

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
  difficulty: 'muito_facil' | 'facil' | 'medio' | 'dificil';
  cognitiveDemand: string;
  solutionStrategy: SolutionStrategyStep[];
  distractorAnalysis: QuestionDistractor[];
  errorDiagnosticPotential: {
    score: number;
    diagnosable: boolean;
    likelyTrapRefs: string[];
    likelyMisconceptionRefs: string[];
    errorMechanisms?: PBLErrorMechanism[];
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
    causalMappingOrigin?: string;
    causalMappingReviewedAt?: string;
  };
  causalDiagnosticReview?: {
    status: 'dual_pass_reviewed' | 'not_reviewed';
    method: string | null;
    model?: string;
    reviewedAt: string | null;
    sourceQuestionSha256?: string;
    reviewSummary?: string;
    unitRefs?: string[];
    targetLearningObjectiveRefs?: string[];
  };
}

export interface QuestionCompetencyLink {
  schemaVersion: string;
  linkId: string;
  officialQuestionRef: string;
  competencyId: string;
  unitId: string;
  lessonId: string;
  sourceKind?: 'official' | 'authored_pbl';
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
  semanticReview?: PBLSemanticReview;
  competencyAssignments?: QuestionCompetencyAssignment[];
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
    candidateMisconceptionRefs?: string[];
    candidateErrorMechanisms?: PBLErrorMechanism[];
    triggerCondition: string;
    errorPattern: string;
    correctiveGuidance: string;
    distractorBreakdown: Array<{
      option: string;
      text: string;
      isCorrect: boolean;
      misconceptionTriggered?: string | null;
      triggeredTrapRef?: string | null;
      causalStatus?: 'causal_candidate' | 'feedback_only';
      errorMechanism?: PBLErrorMechanism | null;
      mappingConfidence?: number;
      refutation: string;
    }>;
    causalReviewStatus?: 'dual_pass_reviewed' | 'not_reviewed';
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
  difficulty: 'muito_facil' | 'facil' | 'medio' | 'dificil';
  cognitiveDelta: string;
  expectedObstacle: string;
  /** Informa quão defensável é o rótulo de transferência deste item. */
  validationStatus?: 'audited' | 'inferred' | 'unverified';
  changedDimensions?: string[];
  anchorQuestionRef?: string;
  sharedCore?: string;
  structuralDifference?: string;
  transferConfidence?: number;
  transferReview?: {
    status?: string;
    method?: string;
    model?: string;
    reviewedAt?: string;
  };
  /** Item reutilizado porque nenhum candidato novo e publicado estava disponível. */
  recentExposureFallback?: boolean;
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
  sourceKind?: 'official' | 'authored_pbl';
  authorLabel?: string;
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
  itemLevelAudit?: {
    status: 'fully_audited' | 'partially_audited';
    auditedItems: number;
    unverifiedItems: number;
    source: string;
    auditedAt: string;
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
  totalAuthoredQuestions?: number;
  totalQuestionLinks?: number;
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
export type PBLAssistanceLevel = 'none' | 'diagnostic' | 'partial' | 'full';

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
  assistanceLevel?: PBLAssistanceLevel;
  isDelayedRetrieval?: boolean;
  elapsedSinceLastPracticeMs?: number;
  detectedTrapRefs: string[];
  detectedMisconceptionRefs: string[];
  interventionRefs: string[];
  transferType?: TransferType;
  transferValidationStatus?: 'audited' | 'inferred' | 'unverified';
  createdAt: string;
}

/** Contrato comum entre a experiência PBL, métricas e conquistas. */
export interface PBLAttemptTelemetryPayload {
  attemptId: string;
  createdAt: string;
  questionId: string;
  isCorrect: boolean;
  userAnswer: string;
  correctAnswer: string;
  moduleId?: string;
  competencyId: string;
  sessionId: string;
  stage: PBLAttemptStage;
  confidence: PBLConfidenceLevel;
  responseTimeMs: number;
  assistanceLevel?: PBLAssistanceLevel;
}

export type MasteryLevel = 'novice' | 'developing' | 'competent' | 'mastered' | 'expert';
export type PBLLearningState =
  | 'acquiring'
  | 'immediate_transfer_confirmed'
  | 'retention_confirmed'
  | 'needs_review';

export interface CompetencyMastery {
  competencyId: string;
  unitId: string;
  lessonId: string;
  score: number; // 0.0 to 1.0
  level: MasteryLevel;
  learningState?: PBLLearningState;
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
  immediateTransferConfirmedAt?: string;
  retentionConfirmedAt?: string;
  lastUnassistedSuccessAt?: string;
  successfulDelayedRetrievals?: number;
  reviewIntervalDays?: number;
}

export type PBLDiagnosisKind =
  | 'slip'
  | 'unknown'
  | 'mapped_error_hypothesis'
  | 'confirmed_error_pattern'
  | 'mapped_misconception'
  | 'prerequisite_deficit';

export interface DiagnosticResult {
  competencyRef: string;
  questionRef: string;
  evaluation: ConfidenceEvaluation;
  diagnosisKind: PBLDiagnosisKind;
  diagnosticEvidence?: {
    source: 'distractor_mapping' | 'diagnostic_path' | 'option_analysis' | 'none';
    matchedOptionLabel?: string;
    pathNodeId?: string;
    errorMechanism?: PBLErrorMechanism | null;
    mappingConfidence?: number;
    confirmedByQuestionRef?: string;
  };
  trapRefs: string[];
  misconceptionRefs: string[];
  candidateMisconceptionRefs?: string[];
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

/** `mastered` é mantido apenas para hidratar sessões v1 já persistidas. */
export type PBLCompetencyOutcome =
  | 'transfer_confirmed'
  | 'retention_confirmed'
  | 'needs_review'
  | 'mastered';

export type PBLReflectionDecision = 'own_rule' | 'suggested_rule' | 'needs_review';

export interface PBLReflectionEntry {
  decision: PBLReflectionDecision;
  note: string;
  suggestedRule: string;
  assistanceUsed?: boolean;
  revealedSuggestedRule?: boolean;
  createdAt: string;
}

export interface PBLReflectionDraft {
  decision?: PBLReflectionDecision;
  note: string;
  suggestedRule: string;
  assistanceUsed?: boolean;
  revealedSuggestedRule?: boolean;
  updatedAt: string;
}

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
  reflectionEntries?: Record<string, PBLReflectionEntry>;
  reflectionDrafts?: Record<string, PBLReflectionDraft>;
  savedErrorQuestionRefs?: string[];
  interventionAssistance?: Record<string, PBLAssistanceLevel>;
  wallTimeMs?: number;
  sessionBudgetMs?: number;
  phaseTimings?: Partial<Record<PBLSessionPhase, number>>;
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
  transferValidationStatus?: 'audited' | 'inferred' | 'unverified';
  hasMisconception: boolean;
  assistanceLevel?: PBLAssistanceLevel;
  isDelayedRetrieval?: boolean;
  elapsedSinceLastPracticeMs?: number;
  diagnosisKind?: PBLDiagnosisKind;
}

export interface MasteryModel {
  update(previous: CompetencyMastery, evidence: MasteryEvidence): CompetencyMastery;
}
import type { QuestionPresentation } from './questionPresentation';
