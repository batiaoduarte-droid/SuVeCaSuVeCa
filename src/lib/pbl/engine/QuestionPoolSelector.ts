import type {
  PBLCompetency,
  PBLQuestionRole,
  PBLQuestionPresentation,
  PBLTransferItem,
  QuestionCompetencyAssignment,
  QuestionCompetencyLink,
  QuestionPedagogy,
  TransferType,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';

export interface PBLQuestionPoolCandidate {
  questionRef: string;
  role: PBLQuestionRole;
  score: number;
  isOnline: boolean;
  presentation: PBLQuestionPresentation;
  link?: QuestionCompetencyLink | null;
  assignment?: QuestionCompetencyAssignment | null;
  pedagogy?: QuestionPedagogy | null;
}

export interface PBLPracticeReadiness {
  ready: boolean;
  anchor?: PBLQuestionPoolCandidate;
  transferQuestionRefs: string[];
  reason?: string;
}

interface SelectQuestionOptions {
  excludedQuestionRefs?: string[];
  excludedPromptFingerprints?: string[];
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

export const normalizeQuestionPrompt = (value: string): string => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR')
  .replace(/\s+/g, ' ')
  .replace(/[^a-z0-9 ]/g, '')
  .trim();

export const buildQuestionFingerprint = (
  presentation: Pick<PBLQuestionPresentation, 'supportText' | 'prompt' | 'options'>
): string => normalizeQuestionPrompt([
  presentation.supportText || '',
  presentation.prompt,
  ...(presentation.options || []).map((option) => `${option.label} ${option.text}`),
].join(' '));

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

  private approvedAssignment(
    competency: PBLCompetency,
    link: QuestionCompetencyLink | null,
    role?: PBLQuestionRole
  ): QuestionCompetencyAssignment | null {
    if (!link) return null;
    const assignments = link.competencyAssignments || [];
    if (assignments.length > 0) {
      return assignments.find((assignment) =>
        assignment.competencyId === competency.competencyId
        && assignment.unitId === competency.unitId
        && assignment.lessonId === competency.lessonId
        && assignment.semanticStatus === 'approved'
        && (!role || assignment.allowedRoles.includes(role))
      ) || null;
    }

    // Compatibility for explicitly reviewed pre-assignment bundles. Missing
    // review is deliberately rejected instead of being treated as approval.
    if (
      link.competencyId === competency.competencyId
      && link.unitId === competency.unitId
      && link.lessonId === competency.lessonId
      && link.semanticReview?.status === 'approved'
    ) {
      return {
        assignmentId: `${link.officialQuestionRef}::${competency.competencyId}`,
        competencyId: competency.competencyId,
        unitId: competency.unitId,
        lessonId: competency.lessonId,
        relation: 'primary',
        semanticStatus: 'approved',
        allowedRoles: ['anchor', 'diagnostic', 'transfer', 'validation'],
        roleScores: {
          anchor: link.pblSuitabilityScores.anchor,
          diagnostic: link.pblSuitabilityScores.diagnostic,
          transfer: link.pblSuitabilityScores.transfer,
          validation: link.pblSuitabilityScores.validation,
        },
        evidenceRefs: link.semanticReview.evidenceRefs || [],
        reviewMethod: 'editorial',
        reviewedAt: link.semanticReview.reviewedAt,
        reason: link.semanticReview.reason,
      };
    }
    return null;
  }

  public async isQuestionEligibleForCompetency(
    competencyId: string,
    questionRef: string
  ): Promise<boolean> {
    const [competency, link] = await Promise.all([
      this.repo.getCompetency(competencyId),
      this.repo.getQuestionCompetencyLink(questionRef),
    ]);
    if (!competency || !link) return false;
    return Boolean(this.approvedAssignment(competency, link));
  }

  public async getPromptFingerprints(questionRefs: string[]): Promise<Set<string>> {
    const presentations = await Promise.all(
      Array.from(new Set(questionRefs)).map((questionRef) => this.repo.getQuestionPresentation(questionRef))
    );
    return new Set(
      presentations
        .map((presentation) => presentation ? buildQuestionFingerprint(presentation) : '')
        .filter(Boolean)
    );
  }

  public async evaluatePracticeReadiness(
    competencyId: string,
    seed = 'readiness'
  ): Promise<PBLPracticeReadiness> {
    const onlineAnchor = await this.selectQuestion(competencyId, 'anchor', {
      onlineOnly: true,
      seed,
    });
    const anchor = onlineAnchor || await this.selectQuestion(competencyId, 'anchor', { seed });
    if (!anchor) {
      return {
        ready: false,
        transferQuestionRefs: [],
        reason: 'Sem questão-âncora publicada e semanticamente vinculada à competência.',
      };
    }

    const firstTransfer = await this.selectQuestion(competencyId, 'transfer', {
      excludedQuestionRefs: [anchor.questionRef],
      seed: `${seed}:transfer:1`,
    });
    const secondTransfer = firstTransfer
      ? await this.selectQuestion(competencyId, 'transfer', {
          excludedQuestionRefs: [anchor.questionRef, firstTransfer.questionRef],
          seed: `${seed}:transfer:2`,
        })
      : null;
    const transferQuestionRefs = [firstTransfer?.questionRef, secondTransfer?.questionRef].filter(
      (value): value is string => Boolean(value)
    );
    return {
      ready: transferQuestionRefs.length >= 2,
      anchor,
      transferQuestionRefs,
      reason: transferQuestionRefs.length >= 2
        ? undefined
        : 'São necessárias duas questões de transferência novas e semanticamente vinculadas.',
    };
  }

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
      const assignment = this.approvedAssignment(competency, link, role);
      const linkScore = assignment?.roleScores?.[role] ?? link?.pblSuitabilityScores?.[role];
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
        assignment,
        pedagogy,
      };
    }));

    const semanticallyEligible = ranked.filter(({ assignment }) => Boolean(assignment));
    if (!semanticallyEligible.length) return null;

    semanticallyEligible.sort((left, right) => {
      const assignedLeft = left.link?.assignedPBLRole === role ? 1 : 0;
      const assignedRight = right.link?.assignedPBLRole === role ? 1 : 0;
      return assignedRight - assignedLeft
        || right.score - left.score
        || left.questionRef.localeCompare(right.questionRef);
    });

    const bestScore = semanticallyEligible[0]?.score ?? 0;
    const qualityFloor = Math.max(0.65, bestScore - 0.1);
    const preferred = semanticallyEligible.filter((candidate) => candidate.score >= qualityFloor);
    const eligible = preferred.length ? preferred : semanticallyEligible;
    const offset = options.seed && eligible.length > 1
      ? stableHash(`${competencyId}:${role}:${options.seed}`) % eligible.length
      : 0;
    const ordered = [
      ...eligible.slice(offset),
      ...eligible.slice(0, offset),
      ...semanticallyEligible.filter((candidate) => !eligible.includes(candidate)),
    ];

    const excludedFingerprints = new Set(options.excludedPromptFingerprints || []);
    const refsFingerprints = await this.getPromptFingerprints(options.excludedQuestionRefs || []);
    refsFingerprints.forEach((fingerprint) => excludedFingerprints.add(fingerprint));

    for (const candidate of ordered) {
      const presentation = await this.repo.getQuestionPresentation(candidate.questionRef);
      if (!presentation?.prompt?.trim() || !presentation.correctAnswer?.trim()) continue;
      if (excludedFingerprints.has(buildQuestionFingerprint(presentation))) continue;
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
