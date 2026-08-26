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
    seed = ''
  ): Promise<PBLTransferItem | null> {
    const xferSet = await this.repo.getTransferSetForCompetency(competencyId);
    if (xferSet?.items.length) {
      const excluded = new Set(excludedQuestionRefs);
      const excludedFingerprints = await this.questionPoolSelector.getPromptFingerprints(excludedQuestionRefs);
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
      const items = available
        .filter(({ eligible, presentation }) =>
          eligible
          && (!requirePresentation || Boolean(presentation))
          && Boolean(presentation)
          && !excludedFingerprints.has(buildQuestionFingerprint(presentation!))
        )
        .map(({ item }) => item);
      // Somente pares comparados item a item podem ocupar a progressão de
      // transferência. Itens sem auditoria continuam disponíveis apenas pelo
      // fallback de prática, sem crédito de transferência ou domínio.
      const auditedItems = items.filter((item) => item.validationStatus === 'audited');
      const order = preferenceOrder(lastEvaluation, currentTransferIndex);
      for (const type of order) {
        const item = auditedItems.find((candidate) => candidate.transferType === type);
        if (!item) continue;
        const genericDelta = normalize(item.cognitiveDelta) === normalize(GENERIC_DELTA);
        return {
          ...item,
          itemOrder: currentTransferIndex + 1,
          validationStatus: item.validationStatus || 'inferred',
          changedDimensions: genericDelta
            ? item.changedDimensions || []
            : item.changedDimensions || xferSet.transferDimensions,
          anchorQuestionRef: item.anchorQuestionRef,
        };
      }
    }

    // O pool online é uma reserva operacional. Sem comparação item-a-item, ele
    // nunca recebe rótulo de far/boundary apenas por causa do score do aluno.
    const onlineCandidate = await this.questionPoolSelector.selectQuestion(competencyId, 'transfer', {
      excludedQuestionRefs,
      onlineOnly: true,
      seed: `${seed}:${currentTransferIndex}:${excludedQuestionRefs.join(',')}`,
    });
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
    };
  }
}
