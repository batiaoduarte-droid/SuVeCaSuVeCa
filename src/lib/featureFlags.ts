/**
 * Rollout is deliberately opt-in until the published catalog passes Gate 0.
 * Disabling the flag restores the atomic navigator without touching learner
 * data, stable unit IDs, recall, PBL sessions or mastery.
 */
export const parseMacroCurriculumFlag = (value: unknown): boolean =>
  String(value || '').trim().toLowerCase() === 'true';

export const MACRO_CURRICULUM_ENABLED = parseMacroCurriculumFlag(
  import.meta.env.VITE_MACRO_CURRICULUM_ENABLED,
);
