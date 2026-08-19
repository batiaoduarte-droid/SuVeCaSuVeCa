import type {
  PBLTransferSet,
  PBLTransferItem,
  ConfidenceEvaluation,
  CompetencyMastery,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';

export class TransferSelector {
  constructor(private repo: IPBLRepository) {}

  public async selectNextTransferItem(
    competencyId: string,
    lastEvaluation: ConfidenceEvaluation,
    currentTransferIndex: number,
    mastery?: CompetencyMastery
  ): Promise<PBLTransferItem | null> {
    const xferSet = await this.repo.getTransferSetForCompetency(competencyId);
    if (!xferSet || xferSet.items.length === 0) return null;

    const items = xferSet.items;
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
    if (currentTransferIndex < items.length) {
      return items[currentTransferIndex];
    }

    return null;
  }
}
