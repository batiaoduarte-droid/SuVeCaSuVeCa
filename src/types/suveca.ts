export type QuestionType = 'CERTO_ERRADO' | 'MULTIPLA_ESCOLHA';

export interface QuizOption {
  letter: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  bank?: string;
  topic?: string;
  supportText?: string;
  questionText: string;
  options?: QuizOption[];
  correctAnswer: string; // 'C', 'E', or 'A', 'B', 'C', 'D', 'E'
  commentary: string;
}

export interface ModuleSection {
  title: string;
  contentMarkdown: string;
  /** Rastreabilidade editorial da revisão integral do corpus. */
  editorial?: {
    reviewVersion: string;
    changeType:
      | 'expanded_after_fulltext_review'
      | 'new_module_after_architecture_gap'
      | 'correct'
      | 'expand'
      | 'new_section';
    evidenceRefs: Array<{
      sourceId: string;
      sourceTitle: string;
      fulltextSha256: string;
      characterRange: [number, number];
      passageId?: string;
      passageTextSha256?: string;
      editorialDecision?: string;
    }>;
  };
  sourceConceptIds?: string[];
  limitsAndExceptions?: string[];
  contrasts?: string[];
  examTraps?: string[];
  keyTable?: {
    headers: string[];
    rows: string[][];
  };
  highlightBox?: {
    title: string;
    text: string;
    type?: 'warning' | 'tip' | 'rule';
  };
}

export type KnowledgeEditorialStatus =
  | 'pending_semantic_review'
  | 'pending_editorial_review'
  | 'approved_ai_reviewed'
  | 'needs_revision'
  | 'insufficient_evidence'
  | 'conflicting_evidence'
  | 'reviewed'
  | 'approved'
  | 'deprecated';

export interface KnowledgeSourceRef {
  id: string;
  title: string;
  type: string;
  url?: string | null;
  score: number;
}

export interface ModuleKnowledgeMeta {
  kbVersion: string;
  buildId: string;
  editorialStatus: KnowledgeEditorialStatus;
  reviewVersion?: string;
  reviewedAt?: string;
  reviewerType?: 'ai' | 'human';
  reviewConfidence?: number | null;
  sourceCount: number;
  sources: KnowledgeSourceRef[];
}

export interface ModuleData {
  id: string; // e.g., 'mod0', 'mod1', ..., 'mod15', 'simulado', 'apendice-a'
  num: number | string;
  title: string;
  subtitle: string;
  description: string;
  sections: ModuleSection[];
  questions?: QuizQuestion[];
  /** Proveniência gerada pela Base Canônica SuVeCA 2.0. */
  knowledge?: ModuleKnowledgeMeta;
}

export interface SuvecaBlock {
  text: string;
  category: 'SUJEITO' | 'VERBO' | 'COMPLEMENTO' | 'ADJUNTO_ADVERBIAL' | 'ADJUNTO_ADNOMINAL' | 'PREDICATIVO' | 'CONECTOR' | 'VOCATIVO' | 'APOSTO';
  shortLabel: string; // 'Su', 'Ve', 'C(OD)', 'C(OI)', 'Aadv', etc.
  colorTag: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan' | 'gray';
  morphology?: string;
  explanation: string;
}

export interface SuvecaAnalysisResult {
  sentence: string;
  order: string;
  verbalVoice: string;
  blocks: SuvecaBlock[];
  summaryExplanation: string;
  contestTips?: string[];
  knowledgeSources?: string[];
}

export interface CadernoErroItem {
  id: string;
  date: string;
  conteudo: string;
  erroCometido: string;
  regraDecisiva: string;
  novoExemplo: string;
  status: 'dia0' | 'dia1' | 'dia7' | 'dia30' | 'dominado';
  moduleRef?: string;
}

export interface ErrorFlashcard {
  id: string;
  errorId?: string;
  source: 'caderno' | 'suveca';
  topic: string;
  front: string;
  back: string;
  hint?: string;
  createdAt: string;
  lastReviewedAt?: string;
  nextReviewAt?: string;
  correctCount: number;
  incorrectCount: number;
}

export interface StudyPreferences {
  enabled: boolean;
  reminderTime: string;
  secondaryReminderEnabled: boolean;
  secondaryReminderTime: string;
  daysOfWeek: string[];
  topics: {
    cadernoErros: boolean;
    dicasGramatica: boolean;
    simuladoMetas: boolean;
    dueloDesafios: boolean;
  };
  emailBackupEnabled: boolean;
  soundEnabled: boolean;
  timeZone: string;
  updatedAt: string;
}

export interface TopicAttemptStats {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

export interface SimuladoAttempt {
  id: string;
  completedAt: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  percentage: number;
  timerEnabled: boolean;
  timeRemainingSeconds?: number;
  byTopic: Record<string, TopicAttemptStats>;
  /** Respostas brutas enviadas para validação do placar no backend. */
  answerMap?: Record<string, string>;
  questionSetVersion?: 'official-simulado-v1';
}

export interface ChecklistItem {
  id: string;
  topic: string;
  moduleNum: number;
  status: 'nao_iniciado' | 'em_estudo' | 'dominado' | 'revisar';
}

export interface DecisionOption {
  label: string;
  targetNodeId?: string;
  result?: string;
  ruleExplanation?: string;
  examples?: string[];
}

export interface DecisionNode {
  id: string;
  title: string;
  question: string;
  options: DecisionOption[];
}

export interface DecisionTreeSet {
  id: string;
  title: string;
  description: string;
  startNodeId: string;
  nodes: Record<string, DecisionNode>;
}
