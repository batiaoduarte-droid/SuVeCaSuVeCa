import type { QuestionDistractor } from '../../../types/pbl';
import { normalizePBLAnswer } from '../answerAdapter';

export type DistractorEvidenceSource =
  | 'semantic_mapping'
  | 'unreviewed_mapping'
  | 'option_analysis'
  | 'none';

export interface NormalizedQuestionDistractor {
  label: string;
  optionText?: string;
  isCorrect?: boolean;
  criterionOrRuleRef?: string | null;
  errorPattern?: string;
  triggeredTrapRef?: string | null;
  likelyMisconceptionRef?: string | null;
  refutation?: string;
  causalStatus?: 'causal_candidate' | 'feedback_only';
  errorMechanism?: QuestionDistractor['errorMechanism'];
  mappingConfidence?: number;
  mappingEvidence?: string;
  evidenceSource: DistractorEvidenceSource;
}

const nonBlankString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/**
 * Normalizes the two published distractor dialects without manufacturing
 * semantic diagnoses. The online `{ label, analysis }` dialect supplies
 * option-level feedback, but it is not evidence of a misconception or trap.
 */
export const normalizeQuestionDistractor = (
  raw: QuestionDistractor | Record<string, unknown>
): NormalizedQuestionDistractor | null => {
  if (!raw || typeof raw !== 'object') return null;

  const label = nonBlankString(raw.label);
  if (!label) return null;

  const analysis = nonBlankString(raw.analysis);
  const likelyMisconceptionRef = nonBlankString(raw.likelyMisconceptionRef) || null;
  const triggeredTrapRef = nonBlankString(raw.triggeredTrapRef) || null;
  const causalStatus = raw.causalStatus === 'causal_candidate' || raw.causalStatus === 'feedback_only'
    ? raw.causalStatus
    : undefined;
  const errorMechanism = typeof raw.errorMechanism === 'string'
    ? raw.errorMechanism as QuestionDistractor['errorMechanism']
    : null;
  const mappingConfidence = typeof raw.mappingConfidence === 'number'
    ? raw.mappingConfidence
    : undefined;
  const hasReviewedSemanticMapping = Boolean(
    causalStatus === 'causal_candidate'
    && errorMechanism
    && (mappingConfidence ?? 0) >= 0.60
  );
  const hasLegacyMapping = Boolean(likelyMisconceptionRef || triggeredTrapRef);

  return {
    label,
    optionText: nonBlankString(raw.optionText),
    isCorrect: typeof raw.isCorrect === 'boolean' ? raw.isCorrect : undefined,
    criterionOrRuleRef: nonBlankString(raw.criterionOrRuleRef) || null,
    errorPattern: nonBlankString(raw.errorPattern) || analysis,
    triggeredTrapRef,
    likelyMisconceptionRef,
    refutation: nonBlankString(raw.refutation) || analysis,
    causalStatus,
    errorMechanism,
    mappingConfidence,
    mappingEvidence: nonBlankString(raw.mappingEvidence),
    evidenceSource: hasReviewedSemanticMapping
      ? 'semantic_mapping'
      : hasLegacyMapping
        ? 'unreviewed_mapping'
      : analysis
        ? 'option_analysis'
        : 'none',
  };
};

export const normalizeDistractorAnalysis = (
  rawDistractors: QuestionDistractor[] | undefined
): NormalizedQuestionDistractor[] => (rawDistractors || [])
  .map((raw) => normalizeQuestionDistractor(raw))
  .filter((item): item is NormalizedQuestionDistractor => Boolean(item));

/**
 * Matches only the option actually chosen by the learner. A single generic
 * `Julgamento` record is not treated as every possible true/false distractor.
 * The one safe exception is endorsement of an explicitly false assertion.
 */
export const findSelectedDistractor = (
  distractors: NormalizedQuestionDistractor[],
  userAnswer: string,
  isCorrect: boolean
): NormalizedQuestionDistractor | undefined => {
  const normalizedChoice = normalizePBLAnswer(userAnswer, 'multiple_choice');
  const labelMatch = distractors.find(
    (item) => normalizePBLAnswer(item.label, 'multiple_choice') === normalizedChoice
  );
  if (labelMatch) return labelMatch;

  if (isCorrect || distractors.length !== 1) return undefined;
  const [assertion] = distractors;
  const isAssertionRecord = normalizePBLAnswer(assertion.label, 'multiple_choice') === 'JULGAMENTO';
  const learnerEndorsedAssertion = normalizePBLAnswer(userAnswer) === 'C';
  if (isAssertionRecord && assertion.isCorrect === false && learnerEndorsedAssertion) {
    return assertion;
  }

  return undefined;
};
