import type {
  PBLTransferSet,
  PBLTransferItem,
  ConfidenceEvaluation,
  CompetencyMastery,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { QuestionPoolSelector } from './QuestionPoolSelector';

export class TransferSelector {
  private questionPoolSelector: QuestionPoolSelector;

  constructor(private repo: IPBLRepository) {
    this.questionPoolSelector = new QuestionPoolSelector(repo);
  }

  public async selectNextTransferItem(
    competencyId: string,
    lastEvaluation: ConfidenceEvaluation,
    currentTransferIndex: number,
    mastery?: CompetencyMastery,
    excludedQuestionRefs: string[] = [],
    requirePresentation = false,
    seed = ''
  ): Promise<PBLTransferItem | null> {
    const onlineCandidate = await this.questionPoolSelector.selectQuestion(competencyId, 'transfer', {
      excludedQuestionRefs,
      onlineOnly: true,
      seed: `${seed}:${currentTransferIndex}:${excludedQuestionRefs.join(',')}`,
    });
    if (onlineCandidate) {
      const transferType = lastEvaluation === 'error' || lastEvaluation === 'high_confidence_error'
        ? 'isomorphic'
        : lastEvaluation === 'fragile_correct'
          ? 'near_transfer'
          : (mastery?.score ?? 0) >= 0.75
            ? 'far_transfer'
            : 'near_transfer';
      return this.questionPoolSelector.toTransferItem(
        onlineCandidate,
        transferType,
        currentTransferIndex + 1
      );
    }

    const xferSet = await this.repo.getTransferSetForCompetency(competencyId);
    if (!xferSet || xferSet.items.length === 0) return null;

    const excluded = new Set(excludedQuestionRefs);
    let items = xferSet.items.filter((item) => !excluded.has(item.officialQuestionRef));
    if (requirePresentation) {
      const available = await Promise.all(
        items.map(async (item) => ({ item, presentation: await this.repo.getQuestionPresentation(item.officialQuestionRef) }))
      );
      items = available.filter(({ presentation }) => Boolean(presentation)).map(({ item }) => item);
    }
    if (!items.length) return null;
    const masteryScore = mastery?.score ?? 0;

    // Adaptive Selection Policy
    if (lastEvaluation === 'error' || lastEvaluation === 'high_confidence_error') {
      // After an error/intervention, present an isomorphic or near transfer item
      const isoItem = items.find((i) => i.transferType === 'isomorphic');
      if (isoItem) return isoItem;
      const nearItem = items.find((i) => i.transferType === 'near_transfer');
      if (nearItem) return nearItem;
    } else if (lastEvaluation === 'fragile_correct') {
      // After fragile correct, test near transfer or boundary case
      const nearItem = items.find((i) => i.transferType === 'near_transfer');
      if (nearItem) return nearItem;
      const boundItem = items.find((i) => i.transferType === 'boundary_case');
      if (boundItem) return boundItem;
    } else if (masteryScore >= 0.75) {
      // Competency almost mastered -> test Far Transfer or Inverted
      const farItem = items.find((i) => i.transferType === 'far_transfer');
      if (farItem) return farItem;
      const invItem = items.find((i) => i.transferType === 'inverted_transfer');
      if (invItem) return invItem;
    }

    // Default sequential progression
    return items[Math.min(currentTransferIndex, items.length - 1)] || items[0] || null;
  }
}
