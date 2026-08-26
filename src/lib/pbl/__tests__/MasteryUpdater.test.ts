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

    expect(updated.score).toBe(0.42);
    expect(updated.level).toBe('developing');
    expect(updated.learningState).toBe('acquiring');
    expect(updated.totalAttempts).toBe(3);
    expect(updated.correctAttempts).toBe(2);
  });

  it('should penalize high confidence error without inventing a mapped misconception', () => {
    const updater = new MasteryUpdater(new RuleBasedMasteryModel());
    const updated = updater.updateMastery(initialMastery, {
      competencyId: 'COMP-A10-G01-01',
      isCorrect: false,
      confidence: 'high',
      stage: 'initial',
      hasMisconception: true,
    });

    expect(updated.score).toBe(0.16);
    expect(updated.level).toBe('novice');
    expect(updated.learningState).toBe('needs_review');
  });

  it('should give less evidence to an assisted transfer than to an audited unassisted transfer', () => {
    const updater = new MasteryUpdater(new RuleBasedMasteryModel());
    const assisted = updater.updateMastery(initialMastery, {
      competencyId: initialMastery.competencyId,
      isCorrect: true,
      confidence: 'high',
      stage: 'transfer',
      transferType: 'far_transfer',
      transferValidationStatus: 'audited',
      assistanceLevel: 'full',
      hasMisconception: false,
    });
    const unassisted = updater.updateMastery(initialMastery, {
      competencyId: initialMastery.competencyId,
      isCorrect: true,
      confidence: 'high',
      stage: 'transfer',
      transferType: 'far_transfer',
      transferValidationStatus: 'audited',
      assistanceLevel: 'none',
      hasMisconception: false,
    });

    expect(assisted.score).toBeLessThan(unassisted.score);
    expect(assisted.transferSuccessCount).toBe(0);
    expect(unassisted.transferSuccessCount).toBe(1);
  });

  it('should record delayed retrieval evidence without prematurely confirming retention', () => {
    const updater = new MasteryUpdater(new RuleBasedMasteryModel());
    const updated = updater.updateMastery(initialMastery, {
      competencyId: initialMastery.competencyId,
      isCorrect: true,
      confidence: 'medium',
      stage: 'initial',
      assistanceLevel: 'none',
      isDelayedRetrieval: true,
      hasMisconception: false,
    });

    expect(updated.learningState).not.toBe('retention_confirmed');
    expect(updated.retentionConfirmedAt).toBeUndefined();
    expect(updated.successfulDelayedRetrievals).toBe(1);

    const confirmed = updater.applyOutcome(updated, 'retention_confirmed');
    expect(confirmed.learningState).toBe('retention_confirmed');
    expect(confirmed.retentionConfirmedAt).toBeDefined();
  });

  it('expands the review interval once, only after the complete retention outcome', () => {
    const updater = new MasteryUpdater(new RuleBasedMasteryModel());
    const spacedMastery = { ...initialMastery, reviewIntervalDays: 8 };
    const delayed = updater.updateMastery(spacedMastery, {
      competencyId: initialMastery.competencyId,
      isCorrect: true,
      confidence: 'high',
      stage: 'initial',
      assistanceLevel: 'none',
      isDelayedRetrieval: true,
      hasMisconception: false,
    });
    const transferred = updater.updateMastery(delayed, {
      competencyId: initialMastery.competencyId,
      isCorrect: true,
      confidence: 'high',
      stage: 'transfer',
      assistanceLevel: 'none',
      transferType: 'near_transfer',
      hasMisconception: false,
    });

    expect(delayed.reviewIntervalDays).toBe(8);
    expect(transferred.reviewIntervalDays).toBe(8);
    expect(updater.applyOutcome(transferred, 'retention_confirmed').reviewIntervalDays).toBe(16);
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
