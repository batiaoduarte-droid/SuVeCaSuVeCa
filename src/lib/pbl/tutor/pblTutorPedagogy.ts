import type { PBLAssistanceLevel, PBLSession, PBLTutorEpisode } from '../../../types/pbl';
import type { PBLTutorQuickCheck } from '../../../types/pblTutor';

export const assistanceRank: Record<PBLAssistanceLevel, number> = {
  none: 0, hint: 1, diagnostic: 1, partial: 2, full: 3,
};

export function maximumAssistance(...levels: Array<PBLAssistanceLevel | undefined>): PBLAssistanceLevel {
  return levels.reduce<PBLAssistanceLevel>((highest, level) =>
    level && assistanceRank[level] > assistanceRank[highest] ? level : highest, 'none');
}

/** Draft selections are not attempts. Old episodes are matched by item, stage and time. */
export function getEpisodeAttempt(session: PBLSession, episode?: PBLTutorEpisode) {
  if (!episode) return undefined;
  return [...session.attempts].reverse().find((attempt) =>
    attempt.sessionId === session.sessionId &&
    attempt.questionRef === episode.questionRef &&
    attempt.competencyRef === episode.competencyRef &&
    attempt.stage === episode.attemptStage &&
    (episode.attemptId
      ? attempt.attemptId === episode.attemptId
      : Boolean(episode.initialUserAnswer) && attempt.userAnswer === episode.initialUserAnswer &&
        attempt.createdAt <= episode.startedAt));
}

const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Structural validation does not certify the grammatical correctness of generated content. */
export function validateQuickCheck(value: unknown, allowedSourceRefs?: Set<string>): PBLTutorQuickCheck | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as PBLTutorQuickCheck;
  if (!nonempty(item.prompt) || !nonempty(item.explanation) || !nonempty(item.correctOption) ||
    !Array.isArray(item.options) || item.options.length < 2 || item.options.length > 4 ||
    item.options.some((option) => !option || !nonempty(option.label) || !nonempty(option.text))) return undefined;
  const options = item.options.map(({ label, text }) => ({ label: label.trim(), text: text.trim() }));
  if (new Set(options.map((option) => option.label.toLocaleUpperCase())).size !== options.length ||
    new Set(options.map((option) => option.text.toLocaleLowerCase())).size !== options.length ||
    !options.some((option) => option.label === item.correctOption.trim())) return undefined;
  const sourceRefs = Array.isArray(item.sourceRefs) ? item.sourceRefs.filter(nonempty) : [];
  if (allowedSourceRefs && (!sourceRefs.length || sourceRefs.some((ref) => !allowedSourceRefs.has(ref)))) return undefined;
  return { prompt: item.prompt.trim(), options, correctOption: item.correctOption.trim(),
    explanation: item.explanation.trim(), ...(sourceRefs.length ? { sourceRefs } : {}) };
}

export function quickCheckIdentity(check: PBLTutorQuickCheck): string {
  return JSON.stringify([check.prompt, check.options, check.correctOption, check.explanation]);
}
