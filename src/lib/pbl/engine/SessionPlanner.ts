import type {
  PBLSession,
  PBLSessionMode,
  CompetencyMastery,
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

export class SessionPlanner {
  private questionPoolSelector: QuestionPoolSelector;

  constructor(private repo: IPBLRepository) {
    this.questionPoolSelector = new QuestionPoolSelector(repo);
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

    if (targetCompetencyId) {
      const competency = await this.repo.getCompetency(targetCompetencyId);
      if (competency) targetCompetencyRefs = [competency.competencyId];
    } else if (mode === 'cumulative' && cumulativeSessionId) {
      const cumSess = await this.repo.getCumulativeSession(cumulativeSessionId);
      if (cumSess) {
        targetCompetencyRefs = [...cumSess.integratedCompetencyRefs];
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
          return scoreA - scoreB;
        });
      targetCompetencyRefs = ranked
        .map((c) => c.competencyId);
    }

    const answerableTargets: string[] = [];
    const initialAnchorByCompetency = new Map<string, string>();
    let targetBlockReason = '';
    for (const competencyId of targetCompetencyRefs) {
      const readiness = await this.questionPoolSelector.evaluatePracticeReadiness(
        competencyId,
        `${userId}:${mode}`
      );
      if (readiness.ready && readiness.anchor) {
        answerableTargets.push(competencyId);
        initialAnchorByCompetency.set(competencyId, readiness.anchor.questionRef);
        if (!targetCompetencyId && answerableTargets.length >= maxCompetencies) break;
      } else if (targetCompetencyId === competencyId) {
        targetBlockReason = readiness.reason || 'A questão-âncora ainda não possui gabarito oficial publicável.';
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
