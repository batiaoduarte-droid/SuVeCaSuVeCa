import type {
  PBLSession,
  PBLSessionMode,
  CompetencyMastery,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';

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

export class SessionPlanner {
  constructor(private repo: IPBLRepository) {}

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

    if (targetCompetencyId) {
      const competency = await this.repo.getCompetency(targetCompetencyId);
      if (competency) targetCompetencyRefs = [competency.competencyId];
    } else if (mode === 'cumulative' && cumulativeSessionId) {
      const cumSess = await this.repo.getCumulativeSession(cumulativeSessionId);
      if (cumSess) {
        targetCompetencyRefs = cumSess.integratedCompetencyRefs.slice(0, maxCompetencies);
      }
    } else if (targetUnitId) {
      const comps = await this.repo.getCompetenciesForUnit(targetUnitId);
      targetCompetencyRefs = comps.map((c) => c.competencyId).slice(0, maxCompetencies);
    } else if (targetLessonId) {
      const comps = await this.repo.getCompetenciesForLesson(targetLessonId);
      // Prioritize competencies with lowest mastery
      targetCompetencyRefs = comps
        .sort((a, b) => {
          const scoreA = currentMasteryMap[a.competencyId]?.score ?? 0;
          const scoreB = currentMasteryMap[b.competencyId]?.score ?? 0;
          return scoreA - scoreB;
        })
        .map((c) => c.competencyId)
        .slice(0, maxCompetencies);
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
          return scoreA - scoreB;
        });
      targetCompetencyRefs = ranked
        .map((c) => c.competencyId)
        .slice(0, maxCompetencies);
    }

    const answerableTargets: string[] = [];
    for (const competencyId of targetCompetencyRefs) {
      const pblCase = await this.repo.getCaseForCompetency(competencyId);
      if (typeof pblCase?.officialAnswer === 'string' && pblCase.officialAnswer.trim()) {
        answerableTargets.push(competencyId);
      }
    }
    targetCompetencyRefs = answerableTargets;

    if (targetCompetencyId && targetCompetencyRefs.length === 0) {
      throw new Error('Esta competência ainda não possui gabarito oficial publicável para uma sessão PBL.');
    }

    if (targetCompetencyRefs.length === 0) {
      const allCompetencies = await this.repo.getAllCompetencies();
      for (const competency of allCompetencies) {
        const pblCase = await this.repo.getCaseForCompetency(competency.competencyId);
        if (typeof pblCase?.officialAnswer === 'string' && pblCase.officialAnswer.trim()) {
          targetCompetencyRefs.push(competency.competencyId);
          break;
        }
      }
    }

    const firstCompId = targetCompetencyRefs[0];
    const initialCase = await this.repo.getCaseForCompetency(firstCompId);
    const initialCaseId = initialCase?.caseId || `PBL-CASE-${firstCompId.replace('COMP-', '')}`;
    const initialQuestionId = initialCase?.anchorQuestionRef || '';

    const sessionId = `pbl_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
      savedErrorQuestionRefs: [],
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
