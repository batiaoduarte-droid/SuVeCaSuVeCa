/**
 * Contrato Canônico de Apresentação e Visualização Semântica (View Model V1 / V2.1 / V4.2)
 * Tipagem estrita com discriminated unions para AST Semântico e Renderers nativos.
 */

// ============================================================
// SEMANTIC AST BLOCKS (v4.2 Discriminated Unions)
// ============================================================

export interface ConceptDefinitionBlock {
  type: 'concept_definition';
  term?: string;
  definition?: string;
  text?: string;
}

export interface ConceptExplanationBlock {
  type: 'concept_explanation';
  text: string;
}

export interface ClassificationCategory {
  name?: string;
  category?: string;
  description?: string;
  examples?: string[];
  items?: string[];
  subcategories?: ClassificationCategory[];
}

export interface ClassificationBlock {
  type: 'classification';
  title?: string;
  categories: ClassificationCategory[];
  text?: string;
}

export interface TaxonomyBlock {
  type: 'taxonomy';
  title?: string;
  categories?: ClassificationCategory[];
  nodes?: ConnectionMapNode[];
  edges?: ConnectionMapEdge[];
  text?: string;
}

export interface ComparisonMatrixBlock {
  type: 'comparison_matrix';
  title?: string;
  columns: string[];
  rows: Array<Record<string, string> | string[]>;
  text?: string;
}

export interface RuleBoundaryBlock {
  type: 'rule_boundary';
  title?: string;
  ruleId?: string;
  scope?: string;
  conditions?: string[];
  exceptions?: string[];
  text?: string;
}

export interface FormulaVariable {
  name: string;
  description: string;
}

export interface FormulaBlock {
  type: 'formula';
  title?: string;
  expression?: string;
  variables?: FormulaVariable[];
  explanation?: string;
  text?: string;
}

export interface ProcedureStep {
  order: number;
  action: string;
  explanation?: string;
  test?: string;
}

export interface ProcedureBlock {
  type: 'procedure';
  title?: string;
  objective?: string;
  steps: ProcedureStep[] | string[];
  text?: string;
}

export interface ContrastSide {
  label: string;
  criteria: string[];
}

export interface ContrastBlock {
  type: 'contrast';
  title?: string;
  conceptA?: string;
  conceptB?: string;
  sideA?: ContrastSide;
  sideB?: ContrastSide;
  decisionCriterion?: string;
  decisiveDifference?: string;
  minimalPair?: {
    left: string;
    right: string;
    decisiveDifference: string;
  };
  text?: string;
}

export interface MinimalPairBlock {
  type: 'minimal_pair';
  title?: string;
  left?: string;
  right?: string;
  sentenceA?: string;
  sentenceB?: string;
  decisiveDifference?: string;
  explanation?: string;
  text?: string;
}

export interface AnnotatedSegment {
  text: string;
  role: string;
  explanation?: string;
}

export interface AnnotatedSentenceBlock {
  type: 'annotated_sentence';
  title?: string;
  sentence: string;
  segments: AnnotatedSegment[];
  analysis?: string;
  text?: string;
}

export interface TableBlock {
  type: 'table';
  title?: string;
  caption?: string;
  columns: string[];
  rows: string[][] | Array<Record<string, string>>;
  text?: string;
}

export interface BulletListBlock {
  type: 'bullet_list';
  ordered?: boolean;
  items: string[];
  title?: string;
  text?: string;
}

export interface RuleBlock {
  type: 'rule';
  title?: string;
  statement?: string;
  scope?: string;
  modality?: string;
  conditions?: string[];
  exceptions?: string[];
  text?: string;
}

export interface WorkedExampleBlock {
  type: 'worked_example';
  title?: string;
  prompt?: string;
  analysisSteps?: string[];
  result?: string;
  decisivePoint?: string;
  commonMistake?: string;
  examTip?: string;
  text?: string;
}

export interface MnemonicBlock {
  type: 'mnemonic';
  title?: string;
  content?: string;
  classification?: string;
  appliesTo?: string;
  limitations?: string;
  text?: string;
}

export interface ExamTrapBlock {
  type: 'exam_trap';
  trapId?: string;
  title?: string;
  trigger?: string;
  misleadingReasoning?: string;
  expectedWrongConclusion?: string;
  correctReasoning?: string;
  decisiveTest?: string;
  correctiveRule?: string;
  text?: string;
}

export interface RecallPromptBlock {
  type: 'recall_prompt';
  promptId?: string;
  question?: string;
  keyPoints?: string[];
  targetConcept?: string;
  targetLO?: string;
  text?: string;
}

// Legacy / Core Content Blocks
export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

export interface HeadingBlock {
  type: 'heading';
  level: number;
  text: string;
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: string[];
}

export interface TableRefBlock {
  type: 'table_ref';
  tableId: string;
  table?: CanonicalTableView;
  coverageOrigin?: 'canonical_table_backfill';
}

export interface CalloutBlock {
  type: 'callout';
  text: string;
  kind?: 'objective' | 'method_limit' | 'insight' | 'warning' | 'default';
}

export interface CodeBlock {
  type: 'code';
  language?: string;
  text: string;
}

export interface DiagramBlock {
  type: 'diagram';
  title?: string;
  diagramType: 'tree' | 'flow' | 'classification' | 'relationship' | 'connection_map';
  text?: string;
  structure?: DiagramStructure;
  nodes?: ConnectionMapNode[];
  edges?: ConnectionMapEdge[];
}

export type DiagramStructureKind = 'sequence' | 'branches' | 'relations' | 'source_segments';

export interface DiagramStructureItem {
  id: string;
  label: string;
  details?: string[];
}

/**
 * Projeção editorial explícita de um desenho textual legado.
 * `sourceText` permanece no bloco `diagram.text`; esta estrutura apenas declara
 * como apresentar as relações já presentes na fonte, sem reinterpretá-las no UI.
 */
export interface DiagramStructure {
  kind: DiagramStructureKind;
  rootLabel?: string;
  items: DiagramStructureItem[];
}

export interface EntityRelationTarget {
  relation: string;
  targetRef: string;
  targetTitle: string;
  targetUnitId: string;
  targetSection: string;
}

/** Learner-facing projection of resolved canonical relations. */
export interface EntityRelationsBlock {
  type: 'entity_relations';
  title?: string;
  relations: EntityRelationTarget[];
}

/**
 * Union discriminada exaustiva para todos os tipos de blocos semânticos v4.2 e legados.
 */
export type SemanticBlock =
  | ConceptDefinitionBlock
  | ConceptExplanationBlock
  | ClassificationBlock
  | TaxonomyBlock
  | ComparisonMatrixBlock
  | RuleBoundaryBlock
  | FormulaBlock
  | ProcedureBlock
  | ContrastBlock
  | MinimalPairBlock
  | AnnotatedSentenceBlock
  | TableBlock
  | BulletListBlock
  | RuleBlock
  | WorkedExampleBlock
  | MnemonicBlock
  | ExamTrapBlock
  | RecallPromptBlock
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | TableRefBlock
  | CalloutBlock
  | CodeBlock
  | DiagramBlock
  | EntityRelationsBlock;

/**
 * Alias de compatibilidade com código existente
 */
export type ContentBlock = SemanticBlock;

export type ContentBlockType = SemanticBlock['type'];

// ============================================================
// DATA MODELS & STRUCTURAL CONTRACTS
// ============================================================

export interface CanonicalTableView {
  tableId: string;
  caption?: string;
  headers: string[];
  rows: string[][];
}

export interface ConnectionMapNode {
  nodeId: string;
  label: string;
  nodeType: 'topic' | 'concept' | 'rule' | 'method' | 'trap' | 'example' | 'contrast';
  metadata?: Record<string, unknown>;
}

export interface ConnectionMapEdge {
  from: string;
  to: string;
  relation: string;
  label?: string;
}

export interface ConnectionMapView {
  mapId: string;
  title?: string;
  mapType: string;
  nodes: ConnectionMapNode[];
  edges: ConnectionMapEdge[];
  rawAscii?: string;
  lineage?: {
    kind: 'canonical' | 'derived_prerequisite_projection';
    canonicalMapRef: string;
  };
}

export interface SuvecaConnectionView {
  level?: 'central' | 'strong' | 'support' | 'indirect' | 'outside_core' | 'review';
  label?: string;
  summary?: string;
  steps?: string[];
  limits?: string[];
  primaryLinguisticLayer?: string;
  entryPoint?: string;
  decisiveTests?: string[];
  contrasts?: string[];
  examTraps?: string[];
  syntacticMapExtensions?: string[];
  macroContext?: string;
  cognitiveAnchor?: string;
  strategicSignificance?: string;
  coreTension?: string;
  visualBlueprint?: string;
}

export interface PrerequisiteView {
  prerequisiteId?: string;
  name: string;
  reason?: string;
  activationPrompt?: string;
  isCritical?: boolean;
}

export interface SourceBackedPresentation {
  status: 'source_backed';
  sourceKind: 'canonical_content_block';
  sourceEntityRefs: string[];
  hideGenericScaffold: boolean;
  renderStrategy?: 'structured_first' | 'source_first' | 'hybrid' | 'source_only';
  diagramIntent?: 'none' | 'explicit';
}

export interface CanonicalEntityView {
  entityId?: string;
  ruleId?: string;
  title: string;
  statement?: string;
  scope?: string;
  modality?: string;
  conditions?: string[];
  formalCondition?: string;
  exceptions?: string[];
  boundaries?: string[];
  examples?: string[];
  normativity?: string;
  priority?: string;
  hasExceptions?: boolean;
  blocks?: SemanticBlock[];
  presentation?: SourceBackedPresentation;
}

export type CanonicalRuleView = CanonicalEntityView;

export interface ProcedureView {
  procedureId?: string;
  title: string;
  objective?: string;
  goal?: string;
  triggerCondition?: string;
  stoppingCondition?: string;
  typicalFailureModes?: string[];
  verificationCriteria?: string | string[];
  inputs?: Array<{ name: string; description?: string } | string>;
  steps?: { order: number; action: string; explanation?: string; test?: string }[] | string[];
  outputs?: Array<{ name: string; description?: string } | string>;
  formulas?: string[];
  computability?: string;
  blocks?: SemanticBlock[];
  presentation?: SourceBackedPresentation;
}

export interface ContrastSideView {
  label?: string;
  criteria?: string[];
  description?: string;
}

export interface ContrastView {
  contrastId?: string;
  title?: string;
  contrastType?: string;
  conceptA?: string;
  conceptB?: string;
  statement?: string;
  left?: string | null;
  right?: string | null;
  sideA?: string | ContrastSideView;
  sideB?: string | ContrastSideView;
  decisionCriterion?: string;
  decisiveDifference?: string;
  minimalPair?: {
    left?: string;
    right?: string;
    decisiveDifference?: string;
    sentenceA?: string;
    sentenceB?: string;
    difference?: string;
  };
  practicalHeuristic?: string;
  pitfall?: string;
  commonConfusion?: string;
  blocks?: SemanticBlock[];
  presentation?: SourceBackedPresentation;
}

export interface WorkedExampleView {
  exampleId?: string;
  title: string;
  prompt?: string;
  sentence?: string;
  statement?: string;
  targetLO?: string;
  analysisSteps?: Array<{ order?: number; action?: string; rationale?: string } | string>;
  analysis?: string;
  reasoning?: string;
  result?: string;
  decisivePoint?: string;
  commonMistake?: string;
  examTip?: string;
  pedagogicalTakeaway?: string;
  blocks?: SemanticBlock[];
  presentation?: SourceBackedPresentation;
}

export interface ExamTrapView {
  trapId?: string;
  title: string;
  trigger?: string;
  misleadingReasoning?: string;
  expectedWrongConclusion?: string;
  correctReasoning?: string;
  decisiveTest?: string;
  studentCaveat?: string;
  errorPattern?: string;
  examBoardBehavior?: string;
  example?: string | null;
  counterexample?: string | null;
  correctiveRule?: string;
  whyItFails?: string;
  correctApproach?: string;
  counterRule?: string;
  bankTechnique?: string;
  blocks?: SemanticBlock[];
  presentation?: SourceBackedPresentation;
}

export interface GlossaryItemView {
  term: string;
  domain?: string;
  shortDefinition?: string;
  fullDefinition?: string;
  operationalUse?: string;
  shortExample?: string;
  commonMisconception?: string;
  detailTarget?: {
    unitId: string;
    section: 'explanation';
    groupId?: string;
  };
}

export interface RecallPromptView {
  promptId: string;
  targetLO?: string;
  targetConcept?: string;
  question: string;
  keyPoints?: string[];
}

export interface OfficialQuestionOptionView {
  label: string;
  text: string;
}

export interface OfficialQuestionPresentationView {
  status: 'ready' | 'source_incomplete' | 'source_conflict';
  stem?: string;
  options: OfficialQuestionOptionView[];
  answer?: string;
  sourceField?: string;
  reason?: string;
  sourcePayloadPreserved: boolean;
}

export interface QuestionPedagogicalEvaluation {
  officialAnswer: string;
  acceptedPedagogicalAnswers?: string[];
  anomalyType?: 'material_error' | 'exam_board_divergence' | 'ambiguous_item';
  editorialCaseRef?: string;
  explanation?: string;
}

export interface DistractorAnalysisView {
  optionLabel: string;
  status: 'correct' | 'incorrect' | 'officially_correct_but_contested' | 'theoretically_defensible';
  explanation: string;
  decisiveCriterion?: string;
}

export interface OfficialQuestionView {
  questionId?: string;
  officialQuestionId?: string;
  sourceQuestionId?: string;
  lessonId?: string;
  schemaVersion?: string;
  questionType?: string;
  examBoard?: string;
  organization?: string;
  year?: number;
  role?: string;
  prompt?: string;
  options?: OfficialQuestionOptionView[];
  officialAnswer?: string;
  explanation?: string;
  questionSha256?: string;
  answerSha256?: string;
  cognitiveDemand?: string;
  solutionStrategy?: string;
  pedagogicalEvaluation?: QuestionPedagogicalEvaluation;
  distractorAnalysis?: DistractorAnalysisView[];
  /** Proveniências equivalentes agregadas pela projeção learner-facing. */
  duplicateSourceQuestionRefs?: string[];
  questionPresentation?: OfficialQuestionPresentationView;
  questionPayload?: {
    question_id?: string;
    question_type?: string;
    exam_board?: string;
    organization?: string;
    year?: number;
    support_text?: string;
    prompt?: string;
    options?: Array<{ label?: string; letter?: string; text?: string }>;
  };
  answerPayload?: {
    answer?: string;
    commentary?: string;
  };
}

export interface ExplanationGroup {
  groupId?: string;
  title?: string;
  pedagogicalGoal?: string;
  semanticKind?: string;
  conceptRefs?: string[];
  blocks: SemanticBlock[];
}

export interface RecallSectionView {
  prompts?: RecallPromptView[];
  blocks?: SemanticBlock[];
}

export interface PedagogicalUnitSections {
  suveca: SuvecaConnectionView;
  prerequisites?: {
    items?: PrerequisiteView[];
    blocks?: SemanticBlock[];
    maps?: ConnectionMapView[];
  };
  explanation?: {
    groups?: ExplanationGroup[];
    blocks?: SemanticBlock[];
  };
  rules?: {
    items: CanonicalRuleView[];
    supplementaryBlocks?: SemanticBlock[];
  };
  resolution?: {
    procedures: ProcedureView[];
  };
  contrasts?: {
    items: ContrastView[];
    supplementaryBlocks?: SemanticBlock[];
  };
  examples?: {
    items: WorkedExampleView[];
    supplementaryBlocks?: SemanticBlock[];
  };
  mnemonics?: {
    blocks: SemanticBlock[];
  };
  traps?: {
    items: ExamTrapView[];
    supplementaryBlocks?: SemanticBlock[];
  };
  glossary?: {
    items?: GlossaryItemView[];
    blocks?: SemanticBlock[];
  };
  recall?: RecallSectionView;
}

export interface PedagogicalUnitView {
  viewSchemaVersion: string;
  source: {
    unitId: string;
    canonicalSchemaVersion?: string;
    buildId?: string;
    generatedAt?: string;
    sourceSemanticVersion?: string;
    semanticHardened?: boolean;
    agentAuthored?: boolean;
  };
  unit: {
    unitId: string;
    lessonId: string;
    groupId?: string;
    title: string;
    variant?: string;
    canonicalTopicId?: string;
    learningObjectives: string[];
    methodologyLevel?: string;
  };
  sections: PedagogicalUnitSections;
  officialQuestions?: OfficialQuestionView[];
}

export interface CumulativeReviewView {
  viewSchemaVersion: '1.0.0' | '4.2.0';
  unitType: 'cumulative_review';
  source: {
    unitId: string;
    lessonId: 'A14';
    generatedAt: string;
    sourceSemanticVersion?: string;
    buildId?: string;
  };
  unit: {
    unitId: string;
    lessonId: 'A14';
    sectionId: string;
    title: string;
    objective: string;
  };
  sections: {
    suveca: SuvecaConnectionView;
    conceptMap: { items: string[] };
    prioritizedRules: { items: string[] };
    structuredSynthesis: { blocks: SemanticBlock[] };
    recoveryExamples: { blocks: SemanticBlock[] };
    activeReviewProtocol: { items: string[] };
  };
}

export interface PedagogicalViewsManifest {
  schemaVersion: string;
  buildId?: string;
  sourceSemanticVersion?: string;
  homologationStatus?: string;
  totalViews?: number;
  regularViews?: number;
  cumulativeViews?: number;
  viewSchemaVersion?: '1.0.0' | '4.2.0';
  sourceBuildId?: string;
  unitsCount?: number;
  standardUnitsCount?: number;
  cumulativeUnitsCount?: number;
  tablesCorpusCount?: number;
  tablesEmbeddedCount?: number;
  questionBlocksCount?: number;
  linkedOfficialQuestionOccurrences?: number;
  linkedOfficialQuestionsUnique?: number;
  officialQuestionsCorpusCount?: number;
  unresolvedRefs?: number;
  unknownBlockTypes?: number;
  generatedAt?: string;
  generatedUnits?: string[];
}
