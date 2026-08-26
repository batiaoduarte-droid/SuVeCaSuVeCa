import type {
  PBLSession,
  PBLSessionMode,
  CompetencyMastery,
  PBLCumulativeSession,
  PBLCompetency,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { QuestionPoolSelector } from './QuestionPoolSelector';

export interface SessionPlanRequest {
  userId: string;
  mode: PBLSessionMode;
  targetLessonId?: string;
  targetUnitId?: string;
  targetCompetencyId?: string;
  cumulativeSessionId?: string;
  currentMasteryMap?: Record<string, CompetencyMastery>;
  maxCompetencies?: number;
}

interface RankedCumulativeCandidate {
  competencyId: string;
  lessonId: string;
  sourceOrder: number;
  isCrossLessonFocus: boolean;
  mastery?: CompetencyMastery;
}

interface CumulativeCandidatePlan {
  preferredGroups: string[][];
  fallbackOrder: string[];
}

const stableSelectionHash = (value: string): number => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const validTimestamp = (value?: string): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

export class SessionPlanner {
  private questionPoolSelector: QuestionPoolSelector;

  constructor(private repo: IPBLRepository) {
    this.questionPoolSelector = new QuestionPoolSelector(repo);
  }

  /**
   * Cumulative reviews deliberately mix an older competency with one from the
   * newest covered lesson. Within each group, review due date and evidence of
   * fragility win; a stable per-user/session rotation then prevents untouched
   * competencies from being permanently hidden by the source order.
   */
  private async buildCumulativeCandidatePlan(
    session: PBLCumulativeSession,
    userId: string,
    masteryMap: Record<string, CompetencyMastery>,
    nowMs: number,
    maxCompetencies: number
  ): Promise<CumulativeCandidatePlan> {
    const [competencies, crossLessonSets] = await Promise.all([
      Promise.all(session.integratedCompetencyRefs.map((id) => this.repo.getCompetency(id))),
      Promise.all(session.crossLessonTransferSetRefs.map((id) => this.repo.getTransferSet(id))),
    ]);
    const crossLessonFocusRefs = new Set(
      crossLessonSets
        .map((set) => set?.competencyRef)
        .filter((id): id is string => Boolean(id))
    );
    const candidateById = new Map<string, RankedCumulativeCandidate>();
    competencies.forEach((competency: PBLCompetency | null, sourceOrder) => {
      if (!competency || candidateById.has(competency.competencyId)) return;
      candidateById.set(competency.competencyId, {
        competencyId: competency.competencyId,
        lessonId: competency.lessonId,
        sourceOrder,
        isCrossLessonFocus: crossLessonFocusRefs.has(competency.competencyId),
        mastery: masteryMap[competency.competencyId],
      });
    });

    const candidates = Array.from(candidateById.values());
    const latestCoveredLesson = [...session.coveredCurricularLessons]
      .reverse()
      .find((lessonId) => candidates.some((candidate) => candidate.lessonId === lessonId));
    const seed = `${userId}:${session.sessionId}:${session.spiralProgressionLevel}`;

    const compare = (left: RankedCumulativeCandidate, right: RankedCumulativeCandidate): number => {
      const leftDueAt = validTimestamp(left.mastery?.nextReviewRecommendedAt);
      const rightDueAt = validTimestamp(right.mastery?.nextReviewRecommendedAt);
      const leftHasPractice = Boolean(left.mastery && left.mastery.totalAttempts > 0);
      const rightHasPractice = Boolean(right.mastery && right.mastery.totalAttempts > 0);
      const leftMisconceptions = left.mastery?.activeMisconceptions.length ?? 0;
      const rightMisconceptions = right.mastery?.activeMisconceptions.length ?? 0;
      const leftIsFragile = leftHasPractice && (leftMisconceptions > 0 || (left.mastery?.score ?? 0) < 0.6);
      const rightIsFragile = rightHasPractice && (rightMisconceptions > 0 || (right.mastery?.score ?? 0) < 0.6);
      const leftReviewState = leftDueAt !== null && leftDueAt <= nowMs
        ? 0
        : leftIsFragile ? 1 : leftHasPractice ? 3 : 2;
      const rightReviewState = rightDueAt !== null && rightDueAt <= nowMs
        ? 0
        : rightIsFragile ? 1 : rightHasPractice ? 3 : 2;
      const leftLastPracticed = validTimestamp(left.mastery?.lastPracticedAt) ?? 0;
      const rightLastPracticed = validTimestamp(right.mastery?.lastPracticedAt) ?? 0;

      return leftReviewState - rightReviewState
        || (leftDueAt ?? Number.MAX_SAFE_INTEGER) - (rightDueAt ?? Number.MAX_SAFE_INTEGER)
        || rightMisconceptions - leftMisconceptions
        || (left.mastery?.score ?? 0) - (right.mastery?.score ?? 0)
        || leftLastPracticed - rightLastPracticed
        || (left.mastery?.totalAttempts ?? 0) - (right.mastery?.totalAttempts ?? 0)
        || Number(right.isCrossLessonFocus) - Number(left.isCrossLessonFocus)
        || stableSelectionHash(`${seed}:${left.competencyId}`) - stableSelectionHash(`${seed}:${right.competencyId}`)
        || left.sourceOrder - right.sourceOrder
        || left.competencyId.localeCompare(right.competencyId);
    };

    const ranked = [...candidates].sort(compare);
    const recent = latestCoveredLesson
      ? ranked.filter((candidate) => candidate.lessonId === latestCoveredLesson)
      : [];
    const older = latestCoveredLesson
      ? ranked.filter((candidate) => candidate.lessonId !== latestCoveredLesson)
      : [];
    const hasActiveReviewProtocol = session.activeReviewProtocols.some((protocol) => protocol.trim().length > 0);

    return {
      preferredGroups: hasActiveReviewProtocol && maxCompetencies >= 2 && older.length > 0 && recent.length > 0
        ? [older.map((candidate) => candidate.competencyId), recent.map((candidate) => candidate.competencyId)]
        : [],
      fallbackOrder: ranked.map((candidate) => candidate.competencyId),
    };
  }

  public async createSession(request: SessionPlanRequest): Promise<PBLSession> {
    const {
      userId,
      mode,
      targetLessonId,
      targetUnitId,
      targetCompetencyId,
      cumulativeSessionId,
      currentMasteryMap = {},
      maxCompetencies = 3,
    } = request;

    let targetCompetencyRefs: string[] = [];
    let cumulativeCandidatePlan: CumulativeCandidatePlan | null = null;

    if (targetCompetencyId) {
      const competency = await this.repo.getCompetency(targetCompetencyId);
      if (competency) targetCompetencyRefs = [competency.competencyId];
    } else if (mode === 'cumulative' && cumulativeSessionId) {
      const cumSess = await this.repo.getCumulativeSession(cumulativeSessionId);
      if (cumSess) {
        cumulativeCandidatePlan = await this.buildCumulativeCandidatePlan(
          cumSess,
          userId,
          currentMasteryMap,
          Date.now(),
          maxCompetencies
        );
        targetCompetencyRefs = cumulativeCandidatePlan.fallbackOrder;
      }
    } else if (targetUnitId) {
      const comps = await this.repo.getCompetenciesForUnit(targetUnitId);
      targetCompetencyRefs = comps.map((c) => c.competencyId);
    } else if (targetLessonId) {
      const comps = await this.repo.getCompetenciesForLesson(targetLessonId);
      // Prioritize competencies with lowest mastery
      targetCompetencyRefs = comps
        .sort((a, b) => {
          const scoreA = currentMasteryMap[a.competencyId]?.score ?? 0;
          const scoreB = currentMasteryMap[b.competencyId]?.score ?? 0;
          return scoreA - scoreB;
        })
        .map((c) => c.competencyId);
    } else {
      // Diagnostic / Recommendation mode: select lowest mastered overall
      const allComps = await this.repo.getAllCompetencies();
      const ranked = allComps
        .sort((a, b) => {
          const scoreA = currentMasteryMap[a.competencyId]?.score ?? 0;
          const scoreB = currentMasteryMap[b.competencyId]?.score ?? 0;
          if (mode === 'diagnostic') {
            const attemptsA = currentMasteryMap[a.competencyId]?.totalAttempts ?? 0;
            const attemptsB = currentMasteryMap[b.competencyId]?.totalAttempts ?? 0;
            return attemptsA - attemptsB || scoreA - scoreB;
          }
          if (mode === 'review') {
            const dueA = Date.parse(currentMasteryMap[a.competencyId]?.nextReviewRecommendedAt || '');
            const dueB = Date.parse(currentMasteryMap[b.competencyId]?.nextReviewRecommendedAt || '');
            const normalizedDueA = Number.isFinite(dueA) ? dueA : Number.MAX_SAFE_INTEGER;
            const normalizedDueB = Number.isFinite(dueB) ? dueB : Number.MAX_SAFE_INTEGER;
            return normalizedDueA - normalizedDueB || scoreA - scoreB;
          }
          return scoreA - scoreB;
        });
      targetCompetencyRefs = ranked
        .map((c) => c.competencyId);
    }

    const answerableTargets: string[] = [];
    const initialAnchorByCompetency = new Map<string, string>();
    let targetBlockReason = '';
    const readinessCache = new Map<string, Awaited<ReturnType<QuestionPoolSelector['evaluatePracticeReadiness']>>>();
    const addFirstAnswerable = async (competencyIds: string[]): Promise<void> => {
      for (const competencyId of competencyIds) {
        if (answerableTargets.includes(competencyId)) continue;
        let readiness = readinessCache.get(competencyId);
        if (!readiness) {
          readiness = await this.questionPoolSelector.evaluatePracticeReadiness(
            competencyId,
            cumulativeSessionId
              ? `${userId}:${mode}:${cumulativeSessionId}`
              : `${userId}:${mode}:${currentMasteryMap[competencyId]?.lastPracticedAt || 'new'}`
          );
          readinessCache.set(competencyId, readiness);
        }
        if (readiness.ready && readiness.anchor) {
          answerableTargets.push(competencyId);
          initialAnchorByCompetency.set(competencyId, readiness.anchor.questionRef);
          return;
        }
        if (targetCompetencyId === competencyId) {
          targetBlockReason = readiness.reason || 'A questão-âncora ainda não possui gabarito oficial publicável.';
        }
      }
    };

    if (cumulativeCandidatePlan?.preferredGroups.length) {
      for (const group of cumulativeCandidatePlan.preferredGroups) {
        if (answerableTargets.length >= maxCompetencies) break;
        await addFirstAnswerable(group);
      }
    }
    if (answerableTargets.length < maxCompetencies) {
      for (const competencyId of targetCompetencyRefs) {
        if (answerableTargets.length >= maxCompetencies) break;
        await addFirstAnswerable([competencyId]);
      }
    }
    targetCompetencyRefs = answerableTargets.slice(0, maxCompetencies);

    if (targetCompetencyId && targetCompetencyRefs.length === 0) {
      throw new Error(`Esta competência ainda não está pronta para uma sessão PBL: ${targetBlockReason}`);
    }

    if ((targetLessonId || targetUnitId || cumulativeSessionId) && targetCompetencyRefs.length === 0) {
      throw new Error('Não há competências com cobertura semântica suficiente neste recorte. Escolha outro tema ou aguarde novas questões.');
    }

    if (targetCompetencyRefs.length === 0) {
      const allCompetencies = await this.repo.getAllCompetencies();
      for (const competency of allCompetencies) {
        const readiness = await this.questionPoolSelector.evaluatePracticeReadiness(
          competency.competencyId,
          `${userId}:${mode}:fallback`
        );
        if (readiness.ready && readiness.anchor) {
          targetCompetencyRefs.push(competency.competencyId);
          initialAnchorByCompetency.set(competency.competencyId, readiness.anchor.questionRef);
          break;
        }
      }
    }

    if (targetCompetencyRefs.length === 0) {
      throw new Error('Nenhuma competência possui a cobertura mínima para iniciar uma sessão PBL agora.');
    }

    const sessionId = `pbl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const firstCompId = targetCompetencyRefs[0];
    const initialCase = await this.repo.getCaseForCompetency(firstCompId);
    const initialCaseId = initialCase?.caseId || `PBL-CASE-${firstCompId.replace('COMP-', '')}`;
    const initialQuestionId = initialAnchorByCompetency.get(firstCompId) || '';
    const now = new Date().toISOString();

    const session: PBLSession = {
      sessionId,
      userId,
      mode,
      status: 'active',
      startedAt: now,
      updatedAt: now,
      targetCompetencyRefs,
      currentCompetencyIndex: 0,
      currentCompetencyRef: firstCompId,
      currentCaseRef: initialCaseId,
      currentQuestionRef: initialQuestionId,
      phase: 'problem',
      currentTransferItemIndex: 0,
      attempts: [],
      masterySnapshot: { ...currentMasteryMap },
      competencyOutcomes: {},
      reflectionNotes: {},
      reflectionEntries: {},
      reflectionDrafts: {},
      savedErrorQuestionRefs: [],
      interventionAssistance: {},
      wallTimeMs: 0,
      sessionBudgetMs: mode === 'cumulative' ? 18 * 60_000 : 12 * 60_000,
      phaseTimings: {},
      sessionStats: {
        initialAccuracy: 0,
        postInterventionAccuracy: 0,
        transferRate: 0,
        misconceptionsCaught: 0,
        totalTimeMs: 0,
      },
    };

    return session;
  }
}
