import type {
  PBLTransferItem,
  ConfidenceEvaluation,
  CompetencyMastery,
  TransferType,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { buildQuestionFingerprint, QuestionPoolSelector } from './QuestionPoolSelector';

const GENERIC_DELTA = 'aplicação da mesma competência em formulação, contexto ou banca diferente';

const normalize = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/[.!?]+$/u, '')
  .trim();

const preferenceOrder = (
  evaluation: ConfidenceEvaluation,
  transferIndex: number
): TransferType[] => {
  if (evaluation === 'error' || evaluation === 'high_confidence_error') {
    return ['isomorphic', 'near_transfer', 'boundary_case', 'far_transfer', 'inverted_transfer'];
  }
  if (evaluation === 'fragile_correct') {
    return ['near_transfer', 'boundary_case', 'isomorphic', 'far_transfer', 'inverted_transfer'];
  }
  if (transferIndex <= 0) {
    return ['near_transfer', 'boundary_case', 'isomorphic', 'far_transfer', 'inverted_transfer'];
  }
  if (transferIndex === 1) {
    return ['boundary_case', 'far_transfer', 'inverted_transfer', 'near_transfer', 'isomorphic'];
  }
  return ['far_transfer', 'inverted_transfer', 'boundary_case', 'near_transfer', 'isomorphic'];
};

export class TransferSelector {
  private questionPoolSelector: QuestionPoolSelector;

  constructor(private repo: IPBLRepository) {
    this.questionPoolSelector = new QuestionPoolSelector(repo);
  }

  public async selectNextTransferItem(
    competencyId: string,
    lastEvaluation: ConfidenceEvaluation,
    currentTransferIndex: number,
    _mastery?: CompetencyMastery,
    excludedQuestionRefs: string[] = [],
    requirePresentation = false,
    seed = '',
    recentlyExposedQuestionRefs: string[] = []
  ): Promise<PBLTransferItem | null> {
    const xferSet = await this.repo.getTransferSetForCompetency(competencyId);
    if (xferSet?.items.length) {
      const excluded = new Set(excludedQuestionRefs);
      const excludedFingerprints = await this.questionPoolSelector.getPromptFingerprints(excludedQuestionRefs);
      const recentExposureFingerprints = await this.questionPoolSelector.getPromptFingerprints(
        recentlyExposedQuestionRefs
      );
      const available = await Promise.all(
        xferSet.items
          .filter((item) => !excluded.has(item.officialQuestionRef))
          .map(async (item) => ({
            item,
            eligible: await this.questionPoolSelector.isQuestionEligibleForCompetency(
              competencyId,
              item.officialQuestionRef
            ),
            presentation: await this.repo.getQuestionPresentation(item.officialQuestionRef),
          }))
      );
      const eligibleItems = available
        .filter(({ eligible, presentation }) =>
          eligible
          && (!requirePresentation || Boolean(presentation))
          && Boolean(presentation)
          && !excludedFingerprints.has(buildQuestionFingerprint(presentation!))
        );
      const items = eligibleItems.map(({ item }) => item);
      const recentlyExposedFingerprints = new Set(
        eligibleItems
          .filter(({ presentation }) => recentExposureFingerprints.has(
            buildQuestionFingerprint(presentation!)
          ))
          .map(({ item }) => item.officialQuestionRef)
      );
      const recentlyExposed = new Set(recentlyExposedQuestionRefs);
      recentlyExposedFingerprints.forEach((questionRef) => recentlyExposed.add(questionRef));
      const auditedItems = items.filter((item) => item.validationStatus === 'audited');
      const freshAuditedItems = auditedItems.filter(
        (item) => !recentlyExposed.has(item.officialQuestionRef)
      );
      const freshPracticeItems = items.filter(
        (item) => item.validationStatus !== 'audited'
          && !recentlyExposed.has(item.officialQuestionRef)
      );
      // Prioridade: transferência auditada e nova; depois aplicação nova sem
      // crédito forte; só por último um item auditado visto recentemente.
      const candidateItems = freshAuditedItems.length > 0
        ? freshAuditedItems
        : freshPracticeItems.length > 0
          ? freshPracticeItems
          : auditedItems;
      const usesRecentExposureFallback = freshAuditedItems.length === 0
        && freshPracticeItems.length === 0
        && auditedItems.length > 0;
      const order = preferenceOrder(lastEvaluation, currentTransferIndex);
      for (const type of order) {
        const item = candidateItems.find((candidate) => candidate.transferType === type);
        if (!item) continue;
        const genericDelta = normalize(item.cognitiveDelta) === normalize(GENERIC_DELTA);
        return {
          ...item,
          itemOrder: currentTransferIndex + 1,
          // Reuso recente preserva a prática, mas não pode certificar
          // transferência como se o contexto fosse novo para o estudante.
          validationStatus: usesRecentExposureFallback ? 'unverified' : item.validationStatus || 'inferred',
          changedDimensions: genericDelta
            ? item.changedDimensions || []
            : item.changedDimensions || xferSet.transferDimensions,
          anchorQuestionRef: item.anchorQuestionRef,
          recentExposureFallback: usesRecentExposureFallback,
        };
      }
    }

    // O pool online é uma reserva operacional. Sem comparação item-a-item, ele
    // nunca recebe rótulo de far/boundary apenas por causa do score do aluno.
    const freshExclusions = [...new Set([...excludedQuestionRefs, ...recentlyExposedQuestionRefs])];
    const recentExposureFingerprints = await this.questionPoolSelector.getPromptFingerprints(
      recentlyExposedQuestionRefs
    );
    let onlineCandidate = await this.questionPoolSelector.selectQuestion(competencyId, 'transfer', {
      excludedQuestionRefs: freshExclusions,
      excludedPromptFingerprints: [...recentExposureFingerprints],
      onlineOnly: true,
      seed: `${seed}:${currentTransferIndex}:${freshExclusions.join(',')}`,
    });
    let recentExposureFallback = false;
    if (!onlineCandidate && recentlyExposedQuestionRefs.length > 0) {
      onlineCandidate = await this.questionPoolSelector.selectQuestion(competencyId, 'transfer', {
        excludedQuestionRefs,
        onlineOnly: true,
        seed: `${seed}:${currentTransferIndex}:${excludedQuestionRefs.join(',')}:reuse`,
      });
      recentExposureFallback = Boolean(onlineCandidate);
    }
    if (!onlineCandidate) return null;
    return {
      ...this.questionPoolSelector.toTransferItem(
        onlineCandidate,
        lastEvaluation === 'error' || lastEvaluation === 'high_confidence_error'
          ? 'isomorphic'
          : 'near_transfer',
        currentTransferIndex + 1
      ),
      validationStatus: 'unverified',
      changedDimensions: [],
      recentExposureFallback,
    };
  }
}
