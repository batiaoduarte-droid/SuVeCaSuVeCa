import type {
  PBLQuestionPresentation,
  PBLTransferItem,
  QuestionCompetencyLink,
  QuestionPedagogy,
  TransferType,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';

export type PBLQuestionRole = 'anchor' | 'diagnostic' | 'transfer' | 'validation';

export interface PBLQuestionPoolCandidate {
  questionRef: string;
  role: PBLQuestionRole;
  score: number;
  isOnline: boolean;
  presentation: PBLQuestionPresentation;
  link?: QuestionCompetencyLink | null;
  pedagogy?: QuestionPedagogy | null;
}

interface SelectQuestionOptions {
  excludedQuestionRefs?: string[];
  onlineOnly?: boolean;
  seed?: string;
}

const roleField = {
  anchor: 'anchorCandidateRefs',
  diagnostic: 'diagnosticCandidateRefs',
  transfer: 'transferCandidateRefs',
  validation: 'validationCandidateRefs',
} as const;

const isOnlineQuestion = (questionRef: string): boolean => questionRef.includes('-estrategia.');

const stableHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export class QuestionPoolSelector {
  constructor(private repo: IPBLRepository) {}

  public async selectQuestion(
    competencyId: string,
    role: PBLQuestionRole,
    options: SelectQuestionOptions = {}
  ): Promise<PBLQuestionPoolCandidate | null> {
    const competency = await this.repo.getCompetency(competencyId);
    if (!competency) return null;

    const excluded = new Set(options.excludedQuestionRefs || []);
    const refs = Array.from(new Set(competency[roleField[role]] || []))
      .filter((questionRef) => !excluded.has(questionRef))
      .filter((questionRef) => !options.onlineOnly || isOnlineQuestion(questionRef));
    if (!refs.length) return null;

    const ranked = await Promise.all(refs.map(async (questionRef) => {
      const [link, pedagogy] = await Promise.all([
        this.repo.getQuestionCompetencyLink(questionRef),
        this.repo.getQuestionPedagogy(questionRef),
      ]);
      const linkScore = link?.pblSuitabilityScores?.[role];
      const pedagogyScore = pedagogy?.pblSuitability?.[role];
      const score = Number.isFinite(linkScore)
        ? Number(linkScore)
        : Number.isFinite(pedagogyScore)
          ? Number(pedagogyScore)
          : 0;
      return {
        questionRef,
        role,
        score,
        isOnline: isOnlineQuestion(questionRef),
        link,
        pedagogy,
      };
    }));

    ranked.sort((left, right) => {
      const assignedLeft = left.link?.assignedPBLRole === role ? 1 : 0;
      const assignedRight = right.link?.assignedPBLRole === role ? 1 : 0;
      return assignedRight - assignedLeft
        || right.score - left.score
        || left.questionRef.localeCompare(right.questionRef);
    });

    const bestScore = ranked[0]?.score ?? 0;
    const qualityFloor = Math.max(0.65, bestScore - 0.1);
    const preferred = ranked.filter((candidate) => candidate.score >= qualityFloor);
    const eligible = preferred.length ? preferred : ranked;
    const offset = options.seed && eligible.length > 1
      ? stableHash(`${competencyId}:${role}:${options.seed}`) % eligible.length
      : 0;
    const ordered = [
      ...eligible.slice(offset),
      ...eligible.slice(0, offset),
      ...ranked.filter((candidate) => !eligible.includes(candidate)),
    ];

    for (const candidate of ordered) {
      const presentation = await this.repo.getQuestionPresentation(candidate.questionRef);
      if (!presentation?.prompt?.trim() || !presentation.correctAnswer?.trim()) continue;
      return { ...candidate, presentation };
    }
    return null;
  }

  public toTransferItem(
    candidate: PBLQuestionPoolCandidate,
    transferType: TransferType,
    itemOrder: number
  ): PBLTransferItem {
    return {
      itemOrder,
      officialQuestionRef: candidate.questionRef,
      transferType,
      examBoard: candidate.presentation.examBoard || 'Estratégia Concursos',
      year: candidate.presentation.year,
      difficulty: candidate.pedagogy?.difficulty || 'medio',
      cognitiveDelta: candidate.pedagogy?.cognitiveDemand
        || 'Aplicação da competência em uma nova questão oficial.',
      expectedObstacle: candidate.pedagogy?.errorDiagnosticPotential?.diagnosticDiscriminator
        || 'Distinguir o critério decisivo antes de responder.',
    };
  }
}
