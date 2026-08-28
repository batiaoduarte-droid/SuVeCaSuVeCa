import { describe, expect, it } from 'vitest';
import type { CompetencyMastery } from '../types/pbl';
import { computeMacroMasteryVector } from './macroMastery';

const mastery = (
  competencyId: string,
  overrides: Partial<CompetencyMastery> = {},
): CompetencyMastery => ({
  competencyId,
  unitId: 'IP-A00-G01',
  lessonId: 'A00',
  score: 0.8,
  level: 'competent',
  learningState: 'acquiring',
  totalAttempts: 2,
  correctAttempts: 1,
  transferSuccessCount: 0,
  activeMisconceptions: [],
  resolvedMisconceptions: [],
  lastPracticedAt: '2026-08-20T10:00:00.000Z',
  nextReviewRecommendedAt: '2026-09-20T10:00:00.000Z',
  ...overrides,
});

describe('computeMacroMasteryVector', () => {
  it('keeps one fragile competency visible when every other competency is retained', () => {
    const result = computeMacroMasteryVector(['C1', 'C2', 'C3'], {
      C1: mastery('C1', { learningState: 'retention_confirmed', retentionConfirmedAt: '2026-08-10T10:00:00.000Z' }),
      C2: mastery('C2', { learningState: 'needs_review', score: 0.35 }),
      C3: mastery('C3', { learningState: 'retention_confirmed', retentionConfirmedAt: '2026-08-10T10:00:00.000Z' }),
    }, Date.parse('2026-08-27T10:00:00.000Z'));

    expect(result.allRetentionConfirmed).toBe(false);
    expect(result.counts.needs_review).toBe(1);
    expect(result.recommendedCompetencyId).toBe('C2');
    expect(result.weakestState).toBe('needs_review');
  });

  it('treats a missing or never-practiced competency as no evidence', () => {
    const result = computeMacroMasteryVector(['C1', 'C2'], {
      C2: mastery('C2', { totalAttempts: 0, learningState: 'retention_confirmed' }),
    });

    expect(result.counts.no_evidence).toBe(2);
    expect(result.allRetentionConfirmed).toBe(false);
  });

  it('prioritizes a due retrieval without averaging scores', () => {
    const result = computeMacroMasteryVector(['C1', 'C2'], {
      C1: mastery('C1', {
        learningState: 'immediate_transfer_confirmed',
        score: 0.95,
        nextReviewRecommendedAt: '2026-08-26T10:00:00.000Z',
      }),
      C2: mastery('C2', { learningState: 'needs_review', score: 0.2 }),
    }, Date.parse('2026-08-27T10:00:00.000Z'));

    expect(result.reviewDueCount).toBe(1);
    expect(result.recommendedCompetencyId).toBe('C1');
    expect(result).not.toHaveProperty('average');
  });

  it('only confirms the macro phrase when every atomic competency has retained evidence', () => {
    const retained = {
      C1: mastery('C1', { learningState: 'retention_confirmed', retentionConfirmedAt: '2026-08-10T10:00:00.000Z' }),
      C2: mastery('C2', { learningState: 'retention_confirmed', retentionConfirmedAt: '2026-08-11T10:00:00.000Z' }),
    };

    const result = computeMacroMasteryVector(['C1', 'C2'], retained);
    expect(result.allRetentionConfirmed).toBe(true);
    expect(result.recommendedCompetencyId).toBeNull();
  });
});
