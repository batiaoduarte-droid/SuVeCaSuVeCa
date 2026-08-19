import type {
  CompetencyMastery,
  MasteryEvidence,
  MasteryLevel,
  MasteryModel,
} from '../../../types/pbl';

export class RuleBasedMasteryModel implements MasteryModel {
  public update(previous: CompetencyMastery, evidence: MasteryEvidence): CompetencyMastery {
    let delta = 0;

    if (evidence.isCorrect) {
      if (evidence.stage === 'initial') {
        delta = evidence.confidence === 'high' ? 0.20 : 0.12;
      } else if (evidence.stage === 'reattempt') {
        delta = 0.10;
      } else if (evidence.stage === 'transfer') {
        if (evidence.transferType === 'far_transfer' || evidence.transferType === 'inverted_transfer') {
          delta = 0.22;
        } else if (evidence.transferType === 'boundary_case') {
          delta = 0.18;
        } else {
          delta = 0.14;
        }
      }
    } else {
      if (evidence.confidence === 'high') {
        delta = -0.20; // High confidence misconception penalized more heavily
      } else {
        delta = -0.10;
      }
    }

    const rawScore = (previous.score || 0) + delta;
    const score = Math.max(0.0, Math.min(1.0, Math.round(rawScore * 100) / 100));
    const level = this.scoreToLevel(score);

    const nextReviewDays = score >= 0.85 ? 5 : score >= 0.60 ? 2 : 1;
    const nextReview = new Date(Date.now() + nextReviewDays * 24 * 60 * 60 * 1000).toISOString();

    return {
      ...previous,
      score,
      level,
      totalAttempts: (previous.totalAttempts || 0) + 1,
      correctAttempts: (previous.correctAttempts || 0) + (evidence.isCorrect ? 1 : 0),
      transferSuccessCount:
        (previous.transferSuccessCount || 0) +
        (evidence.isCorrect && evidence.stage === 'transfer' ? 1 : 0),
      lastPracticedAt: new Date().toISOString(),
      nextReviewRecommendedAt: nextReview,
    };
  }

  private scoreToLevel(score: number): MasteryLevel {
    if (score >= 0.90) return 'expert';
    if (score >= 0.75) return 'mastered';
    if (score >= 0.50) return 'competent';
    if (score >= 0.25) return 'developing';
    return 'novice';
  }
}

export class BKTMasteryModel implements MasteryModel {
  public update(previous: CompetencyMastery, evidence: MasteryEvidence): CompetencyMastery {
    const params = previous.bktParams || {
      pKnown: previous.score || 0.1,
      pTransit: 0.15,
      pSlip: 0.10,
      pGuess: 0.20,
    };

    let pKnownGivenObs = 0;
    if (evidence.isCorrect) {
      pKnownGivenObs =
        (params.pKnown * (1 - params.pSlip)) /
        (params.pKnown * (1 - params.pSlip) + (1 - params.pKnown) * params.pGuess);
    } else {
      pKnownGivenObs =
        (params.pKnown * params.pSlip) /
        (params.pKnown * params.pSlip + (1 - params.pKnown) * (1 - params.pGuess));
    }

    const newPKnown = pKnownGivenObs + (1 - pKnownGivenObs) * params.pTransit;
    const score = Math.max(0.0, Math.min(1.0, Math.round(newPKnown * 100) / 100));

    let level: MasteryLevel = 'novice';
    if (score >= 0.90) level = 'expert';
    else if (score >= 0.75) level = 'mastered';
    else if (score >= 0.50) level = 'competent';
    else if (score >= 0.25) level = 'developing';

    return {
      ...previous,
      score,
      level,
      bktParams: { ...params, pKnown: newPKnown },
      totalAttempts: (previous.totalAttempts || 0) + 1,
      correctAttempts: (previous.correctAttempts || 0) + (evidence.isCorrect ? 1 : 0),
      transferSuccessCount:
        (previous.transferSuccessCount || 0) +
        (evidence.isCorrect && evidence.stage === 'transfer' ? 1 : 0),
      lastPracticedAt: new Date().toISOString(),
      nextReviewRecommendedAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}

export class MasteryUpdater {
  constructor(private model: MasteryModel = new RuleBasedMasteryModel()) {}

  public setModel(model: MasteryModel): void {
    this.model = model;
  }

  public updateMastery(
    previous: CompetencyMastery | undefined,
    evidence: MasteryEvidence,
    unitId: string = 'IP-A00-G01',
    lessonId: string = 'A00'
  ): CompetencyMastery {
    const prevMastery: CompetencyMastery = previous || {
      competencyId: evidence.competencyId,
      unitId,
      lessonId,
      score: 0.1,
      level: 'novice',
      totalAttempts: 0,
      correctAttempts: 0,
      transferSuccessCount: 0,
      activeMisconceptions: [],
      resolvedMisconceptions: [],
      lastPracticedAt: new Date().toISOString(),
      nextReviewRecommendedAt: new Date().toISOString(),
    };

    return this.model.update(prevMastery, evidence);
  }
}
