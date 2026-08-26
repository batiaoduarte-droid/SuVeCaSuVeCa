import type {
  CompetencyMastery,
  MasteryEvidence,
  MasteryLevel,
  MasteryModel,
  PBLCompetencyOutcome,
} from '../../../types/pbl';

const DAY_MS = 24 * 60 * 60 * 1000;

const clampScore = (value: number): number =>
  Math.max(0, Math.min(1, Math.round(value * 100) / 100));

const scoreToLevel = (score: number): MasteryLevel => {
  if (score >= 0.90) return 'expert';
  if (score >= 0.75) return 'mastered';
  if (score >= 0.50) return 'competent';
  if (score >= 0.25) return 'developing';
  return 'novice';
};

const isStrongCorrect = (evidence: MasteryEvidence): boolean =>
  evidence.isCorrect && (evidence.confidence === 'medium' || evidence.confidence === 'high');

const isUnassisted = (evidence: MasteryEvidence): boolean =>
  !evidence.assistanceLevel || evidence.assistanceLevel === 'none';

const assistanceFactor = (evidence: MasteryEvidence): number => {
  switch (evidence.assistanceLevel) {
    case 'full': return 0.30;
    case 'partial': return 0.55;
    case 'diagnostic': return 0.80;
    default: return 1;
  }
};

/**
 * Modelo deliberadamente simples e auditável. Ele atualiza força de evidência,
 * mas não confunde score com retenção: os estados de aprendizagem dependem de
 * transferência imediata e recuperação atrasada explícitas.
 */
export class RuleBasedMasteryModel implements MasteryModel {
  public update(previous: CompetencyMastery, evidence: MasteryEvidence): CompetencyMastery {
    const strongCorrect = isStrongCorrect(evidence);
    const unassisted = isUnassisted(evidence);
    const factor = assistanceFactor(evidence);
    let delta = 0;

    if (evidence.isCorrect) {
      if (!strongCorrect) {
        // Acerto por chute/dúvida é sinal de calibração, não de domínio.
        delta = 0.01;
      } else if (evidence.isDelayedRetrieval) {
        delta = unassisted ? 0.16 : 0.04;
      } else if (evidence.stage === 'initial') {
        delta = 0.12 * factor;
      } else if (evidence.stage === 'reattempt') {
        delta = 0.08 * factor;
      } else if (evidence.stage === 'transfer') {
        const structurallyAudited = evidence.transferValidationStatus === 'audited';
        const base = evidence.transferType === 'far_transfer' || evidence.transferType === 'inverted_transfer'
          ? 0.14
          : evidence.transferType === 'boundary_case'
            ? 0.12
            : 0.10;
        // Rótulo não auditado ainda vale como nova aplicação, mas não recebe
        // o bônus de distância estrutural que os dados não comprovam.
        delta = (structurallyAudited ? base : Math.min(base, 0.03)) * factor;
      }
    } else {
      delta = evidence.confidence === 'high' ? -0.14 : -0.07;
      if (evidence.hasMisconception && evidence.diagnosisKind === 'mapped_misconception') {
        delta -= 0.03;
      }
    }

    const now = new Date();
    const score = clampScore((previous.score || 0) + delta);
    const delayedSuccess = Boolean(evidence.isDelayedRetrieval && strongCorrect && unassisted);
    const successfulDelayedRetrievals =
      (previous.successfulDelayedRetrievals || 0) + (delayedSuccess ? 1 : 0);
    const previousInterval = Math.max(1, previous.reviewIntervalDays || 1);
    // Evidência isolada não expande o espaçamento. O intervalo só cresce
    // em applyOutcome, depois que a sessão valida recuperação + nova aplicação.
    const reviewIntervalDays = evidence.isCorrect ? previousInterval : 1;
    const learningState = evidence.isCorrect
      ? previous.learningState || 'acquiring'
      : 'needs_review' as const;

    return {
      ...previous,
      score,
      level: scoreToLevel(score),
      learningState,
      totalAttempts: (previous.totalAttempts || 0) + 1,
      correctAttempts: (previous.correctAttempts || 0) + (evidence.isCorrect ? 1 : 0),
      transferSuccessCount:
        (previous.transferSuccessCount || 0) +
        (strongCorrect
          && unassisted
          && evidence.stage === 'transfer'
          && evidence.transferValidationStatus === 'audited' ? 1 : 0),
      successfulDelayedRetrievals,
      lastPracticedAt: now.toISOString(),
      lastUnassistedSuccessAt: strongCorrect && unassisted
        ? now.toISOString()
        : previous.lastUnassistedSuccessAt,
      // A tentativa atrasada é evidência necessária, mas o estado só é
      // confirmado por applyOutcome após a validação completa da sessão.
      retentionConfirmedAt: previous.retentionConfirmedAt,
      reviewIntervalDays,
      nextReviewRecommendedAt: new Date(now.getTime() + reviewIntervalDays * DAY_MS).toISOString(),
    };
  }
}

/** Mantido para experimentação controlada; não é o modelo padrão. */
export class BKTMasteryModel implements MasteryModel {
  public update(previous: CompetencyMastery, evidence: MasteryEvidence): CompetencyMastery {
    const params = previous.bktParams || {
      pKnown: previous.score || 0.1,
      pTransit: 0.15,
      pSlip: 0.10,
      pGuess: 0.20,
    };

    const pKnownGivenObs = evidence.isCorrect
      ? (params.pKnown * (1 - params.pSlip)) /
        (params.pKnown * (1 - params.pSlip) + (1 - params.pKnown) * params.pGuess)
      : (params.pKnown * params.pSlip) /
        (params.pKnown * params.pSlip + (1 - params.pKnown) * (1 - params.pGuess));
    const newPKnown = pKnownGivenObs + (1 - pKnownGivenObs) * params.pTransit;
    const score = clampScore(newPKnown);
    const now = new Date();

    return {
      ...previous,
      score,
      level: scoreToLevel(score),
      bktParams: { ...params, pKnown: newPKnown },
      totalAttempts: (previous.totalAttempts || 0) + 1,
      correctAttempts: (previous.correctAttempts || 0) + (evidence.isCorrect ? 1 : 0),
      transferSuccessCount:
        (previous.transferSuccessCount || 0) +
        (isStrongCorrect(evidence)
          && isUnassisted(evidence)
          && evidence.stage === 'transfer'
          && evidence.transferValidationStatus === 'audited' ? 1 : 0),
      learningState: evidence.isCorrect ? previous.learningState || 'acquiring' : 'needs_review',
      lastPracticedAt: now.toISOString(),
      nextReviewRecommendedAt: new Date(now.getTime() + 2 * DAY_MS).toISOString(),
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
    const now = new Date().toISOString();
    const prevMastery: CompetencyMastery = previous || {
      competencyId: evidence.competencyId,
      unitId,
      lessonId,
      score: 0.1,
      level: 'novice',
      learningState: 'acquiring',
      totalAttempts: 0,
      correctAttempts: 0,
      transferSuccessCount: 0,
      activeMisconceptions: [],
      resolvedMisconceptions: [],
      lastPracticedAt: now,
      nextReviewRecommendedAt: now,
      successfulDelayedRetrievals: 0,
      reviewIntervalDays: 1,
    };

    return this.model.update(prevMastery, evidence);
  }

  /** Aplica o veredito pedagógico final sem recalcular evidência de questão. */
  public applyOutcome(
    mastery: CompetencyMastery,
    outcome: PBLCompetencyOutcome,
    now = new Date()
  ): CompetencyMastery {
    const normalizedOutcome = outcome === 'mastered' ? 'transfer_confirmed' : outcome;
    if (normalizedOutcome === 'retention_confirmed') {
      const interval = Math.min(30, Math.max(3, (mastery.reviewIntervalDays || 1) * 2));
      return {
        ...mastery,
        learningState: 'retention_confirmed',
        retentionConfirmedAt: now.toISOString(),
        reviewIntervalDays: interval,
        nextReviewRecommendedAt: new Date(now.getTime() + interval * DAY_MS).toISOString(),
      };
    }
    if (normalizedOutcome === 'transfer_confirmed') {
      return {
        ...mastery,
        learningState: 'immediate_transfer_confirmed',
        immediateTransferConfirmedAt: now.toISOString(),
        reviewIntervalDays: 2,
        nextReviewRecommendedAt: new Date(now.getTime() + 2 * DAY_MS).toISOString(),
      };
    }
    return {
      ...mastery,
      learningState: 'needs_review',
      reviewIntervalDays: 1,
      nextReviewRecommendedAt: new Date(now.getTime() + DAY_MS).toISOString(),
    };
  }
}
