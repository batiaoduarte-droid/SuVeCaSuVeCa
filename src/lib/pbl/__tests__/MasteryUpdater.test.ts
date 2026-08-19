import { describe, it, expect } from 'vitest';
import { MasteryUpdater, RuleBasedMasteryModel, BKTMasteryModel } from '../engine/MasteryUpdater';
import type { CompetencyMastery } from '../../../types/pbl';

describe('MasteryUpdater', () => {
  const initialMastery: CompetencyMastery = {
    competencyId: 'COMP-A10-G01-01',
    unitId: 'IP-A10-G01',
    lessonId: 'A10',
    score: 0.30,
    level: 'developing',
    totalAttempts: 2,
    correctAttempts: 1,
    transferSuccessCount: 0,
    activeMisconceptions: [],
    resolvedMisconceptions: [],
    lastPracticedAt: new Date().toISOString(),
    nextReviewRecommendedAt: new Date().toISOString(),
  };

  it('should increase score on correct initial attempt with high confidence', () => {
    const updater = new MasteryUpdater(new RuleBasedMasteryModel());
    const updated = updater.updateMastery(initialMastery, {
      competencyId: 'COMP-A10-G01-01',
      isCorrect: true,
      confidence: 'high',
      stage: 'initial',
      hasMisconception: false,
    });

    expect(updated.score).toBe(0.50);
    expect(updated.level).toBe('competent');
    expect(updated.totalAttempts).toBe(3);
    expect(updated.correctAttempts).toBe(2);
  });

  it('should heavily penalize high confidence error (misconception)', () => {
    const updater = new MasteryUpdater(new RuleBasedMasteryModel());
    const updated = updater.updateMastery(initialMastery, {
      competencyId: 'COMP-A10-G01-01',
      isCorrect: false,
      confidence: 'high',
      stage: 'initial',
      hasMisconception: true,
    });

    expect(updated.score).toBe(0.10);
    expect(updated.level).toBe('novice');
  });

  it('should update Bayesian Knowledge Tracing model parameters', () => {
    const updater = new MasteryUpdater(new BKTMasteryModel());
    const updated = updater.updateMastery(initialMastery, {
      competencyId: 'COMP-A10-G01-01',
      isCorrect: true,
      confidence: 'high',
      stage: 'transfer',
      transferType: 'far_transfer',
      hasMisconception: false,
    });

    expect(updated.bktParams).toBeDefined();
    expect(updated.bktParams!.pKnown).toBeGreaterThan(0.30);
  });
});
