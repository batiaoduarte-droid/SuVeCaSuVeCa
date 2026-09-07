import type {
  PBLAssistanceLevel,
  PBLAttemptStage,
  PBLConfidenceLevel,
} from './pbl';

export type PBLTutorIntent =
  | 'investigate_confusion'
  | 'explain_rule'
  | 'contrast_options'
  | 'recommend_practice'
  | 'synthesize_notebook'
  | 'encourage_reattempt'
  | 'direct_clarification'
  | 'wrap_up';

export type PBLTutorContinuityRecommendation =
  | 'try_same'
  | 'try_alternative'
  | 'review_contrast'
  | 'proceed_transfer'
  | 'proceed_reflection';

export interface PBLTutorNotebookDraft {
  title: string;
  triggerCondition: string;
  decisionRule: string;
  contrastExample: string;
}

export interface PBLTutorTurn {
  turnId: string;
  role: 'student' | 'tutor' | 'system';
  content: string;
  timestamp: string;
  intent?: PBLTutorIntent;
  studentAssistanceRequested?: boolean;
  continuityRecommendation?: PBLTutorContinuityRecommendation;
  suggestedExercise?: {
    questionRef: string;
    promptPreview: string;
  };
  sourceRefs?: string[];
  notebookDraft?: PBLTutorNotebookDraft;
  executionMetadata?: {
    model: string;
    durationMs: number;
    tokensUsed?: number;
    fallback?: boolean;
  };
}

export interface PBLTutorEpisode {
  episodeId: string;
  sessionId: string;
  competencyRef: string;
  questionRef: string;
  attemptStage: PBLAttemptStage;
  initialUserAnswer?: string;
  initialConfidence?: PBLConfidenceLevel;
  assistanceLevel: PBLAssistanceLevel;
  startedAt: string;
  updatedAt: string;
  turns: PBLTutorTurn[];
  resolved: boolean;
  totalAiLatencyMs: number;
  notebookDraft?: PBLTutorNotebookDraft;
}

export interface PBLTutorOptionAnalysis {
  label: string;
  isCorrect: boolean;
  optionText: string;
  refutation: string;
  authoritative: boolean;
}

export interface PBLTutorPedagogyRule {
  ruleRef: string;
  title: string;
  statement: string;
  conditions?: string[];
  exceptions?: string[];
  resolvedTable?: {
    id: string;
    unitId: string;
    title: string;
    columns: string[];
    rows: string[][];
  };
}

export interface PBLTutorPedagogyProcedure {
  procedureRef: string;
  title: string;
  markdown: string;
}

export interface PBLTutorPedagogyContrast {
  contrastRef: string;
  title: string;
  poleA: string;
  poleB: string;
  decisionCriterion: string;
}

export interface PBLTutorQuestionPresentation {
  prompt: string;
  command?: string;
  supportBlocks?: any[];
  options: Array<{ label: string; text: string }>;
  officialAnswer: string;
  questionType?: string;
  examBoard?: string;
  year?: number;
}

export interface PBLTutorQuestionContext {
  questionRef: string;
  primaryCompetencyRef?: string;
  competencyRefs?: string[];
  competencyTitle?: string;
  lessonId?: string;
  unitRefs?: string[];
  presentation: PBLTutorQuestionPresentation;
  pedagogy?: {
    cognitiveDemand?: string;
    difficulty?: string;
    learningObjectives?: string[];
    testedConcepts?: string[];
    rules?: PBLTutorPedagogyRule[];
    procedures?: PBLTutorPedagogyProcedure[];
    contrasts?: PBLTutorPedagogyContrast[];
  };
  criteria: {
    rules: PBLTutorPedagogyRule[];
    procedures: PBLTutorPedagogyProcedure[];
    contrasts: PBLTutorPedagogyContrast[];
  };
  officialCommentary?: string;
  solutionStrategy?: Array<{
    stepNumber: number;
    action: string;
    rationale?: string;
  }>;
  objectiveOptionAnalyses?: PBLTutorOptionAnalysis[];
  curriculum: {
    macroGroupId?: string;
    macroGroupTitle?: string;
    prerequisites?: string[];
  };
  provenance: {
    questionSha256?: string;
    hasGaps?: boolean;
    gapDetails?: string[];
  };
}

export interface PBLTutorTurnRequest {
  sessionId: string;
  competencyRef: string;
  questionRef: string;
  userMessage: string;
  studentAttemptContext?: {
    userAnswer: string;
    isCorrect: boolean;
    confidence?: PBLConfidenceLevel;
    attemptStage: PBLAttemptStage;
  };
  history?: Array<{
    role: 'student' | 'tutor';
    text: string;
    intent?: PBLTutorIntent;
  }>;
  assistanceRequested?: boolean;
  directExplanationRequested?: boolean;
  cadernoSynthesisRequested?: boolean;
}

export interface PBLTutorTurnResponse {
  pedagogicalText: string;
  intent: PBLTutorIntent;
  continuityRecommendation: PBLTutorContinuityRecommendation;
  sourceRefs: string[];
  suggestedExercise?: {
    questionRef: string;
    promptPreview: string;
  };
  notebookDraft?: PBLTutorNotebookDraft;
  executionMetadata: {
    model: string;
    durationMs: number;
    tokensUsed?: number;
    fallback?: boolean;
  };
}
