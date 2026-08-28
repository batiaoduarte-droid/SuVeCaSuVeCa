/**
 * The published catalog passed Gate 0 and is now the operational default.
 * Setting the flag to false restores the atomic navigator without touching learner
 * data, stable unit IDs, recall, PBL sessions or mastery.
 */
export const parseMacroCurriculumFlag = (value: unknown): boolean =>
  String(value || '').trim().toLowerCase() === 'true';

export const MACRO_CURRICULUM_ENABLED = parseMacroCurriculumFlag(
  import.meta.env.VITE_MACRO_CURRICULUM_ENABLED ?? 'true',
);
