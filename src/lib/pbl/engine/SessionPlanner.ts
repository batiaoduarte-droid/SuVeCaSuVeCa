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
      cumulativeSessionId,
      currentMasteryMap = {},
      maxCompetencies = 3,
    } = request;

    let targetCompetencyRefs: string[] = [];

    if (mode === 'cumulative' && cumulativeSessionId) {
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
      targetCompetencyRefs = allComps
        .sort((a, b) => {
          const scoreA = currentMasteryMap[a.competencyId]?.score ?? 0;
          const scoreB = currentMasteryMap[b.competencyId]?.score ?? 0;
          return scoreA - scoreB;
        })
        .map((c) => c.competencyId)
        .slice(0, maxCompetencies);
    }

    if (targetCompetencyRefs.length === 0) {
      const firstComp = (await this.repo.getAllCompetencies())[0];
      if (firstComp) targetCompetencyRefs.push(firstComp.competencyId);
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
