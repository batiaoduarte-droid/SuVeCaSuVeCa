import type { CompetencyMastery, PBLLearningState } from '../types/pbl';

export type MacroMasteryEvidenceState =
  | 'no_evidence'
  | 'acquiring'
  | 'needs_review'
  | 'immediate_transfer_confirmed'
  | 'retention_confirmed';

export interface MacroMasteryVector {
  totalCompetencies: number;
  counts: Record<MacroMasteryEvidenceState, number>;
  reviewDueCount: number;
  allRetentionConfirmed: boolean;
  weakestState: MacroMasteryEvidenceState | null;
  recommendedCompetencyId: string | null;
}

const STATE_PRIORITY: Record<MacroMasteryEvidenceState, number> = {
  needs_review: 0,
  no_evidence: 1,
  acquiring: 2,
  immediate_transfer_confirmed: 3,
  retention_confirmed: 4,
};
const EMPTY_COUNTS: Record<MacroMasteryEvidenceState, number> = {
  no_evidence: 0,
  acquiring: 0,
  needs_review: 0,
  immediate_transfer_confirmed: 0,
  retention_confirmed: 0,
};

const isReviewDue = (mastery: CompetencyMastery | undefined, nowMs: number): boolean => {
  if (!mastery || mastery.totalAttempts <= 0) return false;
  const dueAt = Date.parse(mastery.nextReviewRecommendedAt || '');
  return Number.isFinite(dueAt) && dueAt <= nowMs;
};

export const macroEvidenceStateFor = (
  mastery: CompetencyMastery | undefined,
): MacroMasteryEvidenceState => {
  if (!mastery || mastery.totalAttempts <= 0) return 'no_evidence';

  const state: PBLLearningState = mastery.learningState
    || (mastery.retentionConfirmedAt
      ? 'retention_confirmed'
      : mastery.immediateTransferConfirmedAt
        ? 'immediate_transfer_confirmed'
        : mastery.activeMisconceptions?.length
          ? 'needs_review'
          : 'acquiring');

  return state;
};

/**
 * Projects atomic PBL evidence for a navigation macro.
 *
 * It deliberately does not calculate an average and accepts no reading, visit
 * or generic-practice signal. The macro remains a container; mastery stays
 * indexed by competencyId.
 */
export const computeMacroMasteryVector = (
  competencyRefs: readonly string[],
  masteryByCompetency: Readonly<Record<string, CompetencyMastery>>,
  nowMs = Date.now(),
): MacroMasteryVector => {
  const uniqueRefs = [...new Set(competencyRefs.filter(Boolean))];
  const counts = { ...EMPTY_COUNTS };

  const evidence = uniqueRefs.map((competencyId) => {
    const mastery = masteryByCompetency[competencyId];
    const state = macroEvidenceStateFor(mastery);
    counts[state] += 1;
    return {
      competencyId,
      mastery,
      state,
      due: isReviewDue(mastery, nowMs),
    };
  });

  const ranked = [...evidence].sort((left, right) => {
    // A scheduled retrieval that is already due is the first legitimate next
    // action, regardless of a historical score.
    if (left.due !== right.due) return left.due ? -1 : 1;
    const stateDelta = STATE_PRIORITY[left.state] - STATE_PRIORITY[right.state];
    if (stateDelta !== 0) return stateDelta;
    const scoreDelta = (left.mastery?.score ?? -1) - (right.mastery?.score ?? -1);
    if (scoreDelta !== 0) return scoreDelta;
    return left.competencyId.localeCompare(right.competencyId);
  });

  const weakestState = evidence.length
    ? evidence.reduce<MacroMasteryEvidenceState>((weakest, item) => (
      STATE_PRIORITY[item.state] < STATE_PRIORITY[weakest] ? item.state : weakest
    ), evidence[0].state)
    : null;

  const allRetentionConfirmed = evidence.length > 0
    && evidence.every((item) => item.state === 'retention_confirmed');

  return {
    totalCompetencies: evidence.length,
    counts,
    reviewDueCount: evidence.filter((item) => item.due).length,
    allRetentionConfirmed,
    weakestState,
    recommendedCompetencyId: allRetentionConfirmed ? null : ranked[0]?.competencyId || null,
  };
};
