import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, type User } from '../lib/firebase';
import type { LearningAttempt } from '../components/StatisticsDashboard';
import { PEDAGOGICAL_KNOWLEDGE_BUILD } from '../data/pedagogicalKnowledge.generated';
import { MODULES_DATA } from '../data/modulesData';

export interface LearningMetrics {
  schemaVersion: 2;
  curriculumBuildId: string;
  attempts: LearningAttempt[];
  visitedModuleIds: string[];
  visitedMacroIds: string[];
  readUnitIds: string[];
  legacyReadSectionIds: string[];
  /** Compatibilidade v1; novas decisões devem preferir readUnitIds. */
  readSectionIds: string[];
  modulePractice: Record<string, { answered: number; correct: number; completed: boolean }>;
  updatedAt?: string;
}

const CURRICULUM_BUILD_ID = PEDAGOGICAL_KNOWLEDGE_BUILD.buildId;
const EMPTY_METRICS: LearningMetrics = {
  schemaVersion: 2,
  curriculumBuildId: CURRICULUM_BUILD_ID,
  attempts: [],
  visitedModuleIds: [],
  visitedMacroIds: [],
  readUnitIds: [],
  legacyReadSectionIds: [],
  readSectionIds: [],
  modulePractice: {},
};

const unitIdForSection = (section?: (typeof MODULES_DATA)[number]['sections'][number]) => {
  const cumulativeMatch = section.contentUrl?.match(/A14-(S\d+)/);
  return section.editorial?.integrationUnitId
    || (cumulativeMatch ? `IP-A14-${cumulativeMatch[1]}` : null);
};

export const resolveLegacyReadUnitIds = (readSectionIds: string[]): string[] => {
  const unitIds = readSectionIds.flatMap((sectionId) => {
    const match = /^(.*):section-(\d+)$/.exec(sectionId);
    if (!match) return [];
    const module = MODULES_DATA.find((candidate) => candidate.id === match[1]);
    const section = module?.sections[Number(match[2])];
    const unitId = section ? unitIdForSection(section) : null;
    return unitId ? [unitId] : [];
  });
  return [...new Set(unitIds)];
};

const storageKeyFor = (userId?: string | null) =>
  userId
    ? `suveca_learning_metrics_${CURRICULUM_BUILD_ID}_${userId}`
    : `suveca_learning_metrics_${CURRICULUM_BUILD_ID}_guest`;

const readLocalMetrics = (userId?: string | null): LearningMetrics => {
  try {
    const stored = localStorage.getItem(storageKeyFor(userId));
    if (!stored) return EMPTY_METRICS;
    const parsed = JSON.parse(stored) as Partial<LearningMetrics>;
    if (parsed.curriculumBuildId !== CURRICULUM_BUILD_ID) return EMPTY_METRICS;
    const legacyReadSectionIds = Array.isArray(parsed.legacyReadSectionIds)
      ? parsed.legacyReadSectionIds
      : Array.isArray(parsed.readSectionIds) ? parsed.readSectionIds : [];
    return {
      schemaVersion: 2,
      curriculumBuildId: CURRICULUM_BUILD_ID,
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      visitedModuleIds: Array.isArray(parsed.visitedModuleIds) ? parsed.visitedModuleIds : [],
      visitedMacroIds: Array.isArray(parsed.visitedMacroIds) ? parsed.visitedMacroIds : [],
      readUnitIds: [...new Set([
        ...(Array.isArray(parsed.readUnitIds) ? parsed.readUnitIds : []),
        ...resolveLegacyReadUnitIds(legacyReadSectionIds),
      ])],
      legacyReadSectionIds,
      readSectionIds: legacyReadSectionIds,
      modulePractice: parsed.modulePractice && typeof parsed.modulePractice === 'object' ? parsed.modulePractice : {},
      updatedAt: parsed.updatedAt,
    };
  } catch (error) {
    console.warn('Não foi possível recuperar as métricas locais:', error);
    return EMPTY_METRICS;
  }
};

const normalizeMetrics = (value: unknown): LearningMetrics => {
  if (!value || typeof value !== 'object') return EMPTY_METRICS;
  const data = value as Partial<LearningMetrics>;
  if (data.curriculumBuildId !== CURRICULUM_BUILD_ID) return EMPTY_METRICS;
  const legacyReadSectionIds = Array.isArray(data.legacyReadSectionIds)
    ? data.legacyReadSectionIds
    : Array.isArray(data.readSectionIds) ? data.readSectionIds : [];
  return {
    schemaVersion: 2,
    curriculumBuildId: CURRICULUM_BUILD_ID,
    attempts: Array.isArray(data.attempts) ? data.attempts : [],
    visitedModuleIds: Array.isArray(data.visitedModuleIds) ? data.visitedModuleIds : [],
    visitedMacroIds: Array.isArray(data.visitedMacroIds) ? data.visitedMacroIds : [],
    readUnitIds: [...new Set([
      ...(Array.isArray(data.readUnitIds) ? data.readUnitIds : []),
      ...resolveLegacyReadUnitIds(legacyReadSectionIds),
    ])],
    legacyReadSectionIds,
    readSectionIds: legacyReadSectionIds,
    modulePractice: data.modulePractice && typeof data.modulePractice === 'object' ? data.modulePractice : {},
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
  };
};

const mergeMetrics = (local: LearningMetrics, cloud: LearningMetrics): LearningMetrics => {
  const byId = new Map<string, LearningAttempt>();
  [...local.attempts, ...cloud.attempts].forEach((attempt) => {
    if (attempt?.id) byId.set(attempt.id, attempt);
  });

  const attempts = [...byId.values()]
    .sort(
      (first, second) =>
        new Date(first.completedAt || first.createdAt || 0).getTime() -
        new Date(second.completedAt || second.createdAt || 0).getTime()
    )
    .slice(-50);

  return {
    schemaVersion: 2,
    curriculumBuildId: CURRICULUM_BUILD_ID,
    attempts,
    visitedModuleIds: [...new Set([...local.visitedModuleIds, ...cloud.visitedModuleIds])],
    visitedMacroIds: [...new Set([...local.visitedMacroIds, ...cloud.visitedMacroIds])],
    readUnitIds: [...new Set([...local.readUnitIds, ...cloud.readUnitIds])],
    legacyReadSectionIds: [...new Set([
      ...local.legacyReadSectionIds,
      ...cloud.legacyReadSectionIds,
    ])],
    readSectionIds: [...new Set([
      ...local.legacyReadSectionIds,
      ...cloud.legacyReadSectionIds,
    ])],
    modulePractice: { ...local.modulePractice, ...cloud.modulePractice },
    updatedAt: cloud.updatedAt || local.updatedAt,
  };
};

/** Persists lightweight dashboard metrics locally and, for signed-in users, in Firestore. */
export const useLearningMetrics = (user: User | null) => {
  const currentUserId = user?.uid || null;
  const [metrics, setMetrics] = useState<LearningMetrics>(() => readLocalMetrics(null));
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [activeStorageUserId, setActiveStorageUserId] = useState<string | null>(null);
  const hydrationId = useRef(0);
  const lastActivityTouchRef = useRef(0);

  useEffect(() => {
    const currentHydration = ++hydrationId.current;
    const localMetrics = readLocalMetrics(currentUserId);
    setMetrics(localMetrics);
    setActiveStorageUserId(currentUserId);

    if (!user) {
      setIsLoadingMetrics(false);
      return;
    }

    setIsLoadingMetrics(true);
    const loadCloudMetrics = async () => {
      try {
        const metricsRef = doc(db, 'users', user.uid, 'data', `learning_metrics_${CURRICULUM_BUILD_ID}`);
        const snapshot = await getDoc(metricsRef);
        if (currentHydration !== hydrationId.current) return;

        if (snapshot.exists()) {
          setMetrics(mergeMetrics(localMetrics, normalizeMetrics(snapshot.data())));
        }
      } catch (error) {
        console.error('Erro ao carregar métricas de aprendizagem:', error);
      } finally {
        if (currentHydration === hydrationId.current) setIsLoadingMetrics(false);
      }
    };

    void loadCloudMetrics();
  }, [currentUserId]);

  useEffect(() => {
    if (activeStorageUserId !== currentUserId) return;
    localStorage.setItem(
      storageKeyFor(currentUserId),
      JSON.stringify({ ...metrics, updatedAt: metrics.updatedAt || new Date().toISOString() })
    );
  }, [activeStorageUserId, currentUserId, metrics]);

  useEffect(() => {
    if (!user || isLoadingMetrics || activeStorageUserId !== currentUserId) return;

    const timeout = window.setTimeout(() => {
      void setDoc(
        doc(db, 'users', currentUserId, 'data', `learning_metrics_${CURRICULUM_BUILD_ID}`),
        { ...metrics, curriculumBuildId: CURRICULUM_BUILD_ID, updatedAt: new Date().toISOString() },
        { merge: true }
      ).catch((error) => console.error('Erro ao salvar métricas de aprendizagem:', error));
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [activeStorageUserId, currentUserId, isLoadingMetrics, metrics, user]);

  /**
   * A lightweight server timestamp is used by scheduled reminders. It is
   * throttled so navigation never becomes a write-per-click operation.
   */
  const recordActivity = useCallback(() => {
    if (!currentUserId || activeStorageUserId !== currentUserId) return;

    const now = Date.now();
    if (now - lastActivityTouchRef.current < 10 * 60 * 1000) return;
    lastActivityTouchRef.current = now;

    void setDoc(
      doc(db, 'users', currentUserId),
      {
        lastActivityAt: serverTimestamp(),
        lastActivityClientAt: new Date(now).toISOString(),
      },
      { merge: true }
    ).catch((error) => console.error('Erro ao registrar atividade de estudo:', error));
  }, [activeStorageUserId, currentUserId]);

  useEffect(() => {
    recordActivity();
  }, [recordActivity]);

  const markModuleVisited = useCallback((moduleId: string) => {
    if (!moduleId) return;
    if (activeStorageUserId !== currentUserId) return;
    recordActivity();
    setMetrics((current) => {
      if (current.visitedModuleIds.includes(moduleId)) return current;
      return {
        ...current,
        visitedModuleIds: [...current.visitedModuleIds, moduleId],
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeStorageUserId, currentUserId, recordActivity]);

  const markMacroVisited = useCallback((macroId: string) => {
    if (!macroId || activeStorageUserId !== currentUserId) return;
    recordActivity();
    setMetrics((current) => {
      if (current.visitedMacroIds.includes(macroId)) return current;
      return {
        ...current,
        visitedMacroIds: [...current.visitedMacroIds, macroId],
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeStorageUserId, currentUserId, recordActivity]);

  const addAttempt = useCallback((attempt: LearningAttempt) => {
    if (!attempt?.id) return;
    if (activeStorageUserId !== currentUserId) return;
    recordActivity();

    const { answerMap, ...attemptSummary } = attempt;
    setMetrics((current) => ({
      ...current,
      attempts: [
        ...current.attempts.filter((item) => item.id !== attempt.id),
        attemptSummary,
      ].slice(-50),
      updatedAt: new Date().toISOString(),
    }));

    // The client only submits raw answers. The Cloud Function owns the score
    // used by the public leaderboard and never accepts this client's totals.
    if (
      currentUserId &&
      typeof attempt.questionSetVersion === 'string' &&
      /^editorial-(?:simulado|corpus)-[0-9a-f]{16}$/.test(attempt.questionSetVersion) &&
      answerMap &&
      Object.keys(answerMap).length > 0
    ) {
      void setDoc(
        doc(db, 'users', currentUserId, 'attempt_submissions', attempt.id),
        {
          schemaVersion: 1,
          questionSetVersion: attempt.questionSetVersion,
          answerMap,
          clientCompletedAt: attempt.completedAt || new Date().toISOString(),
          submittedAtClient: new Date().toISOString(),
        }
      ).catch((error) =>
        console.error('Erro ao enviar tentativa para validação do ranking:', error)
      );
    }
  }, [activeStorageUserId, currentUserId, recordActivity]);

  const markSectionRead = useCallback((moduleId: string, sectionIndex: number, unitId?: string | null) => {
    if (activeStorageUserId !== currentUserId) return;
    const sectionId = `${moduleId}:section-${sectionIndex}`;
    recordActivity();
    setMetrics((current) => {
      const resolvedUnitId = unitId
        || unitIdForSection(MODULES_DATA.find((module) => module.id === moduleId)?.sections[sectionIndex]);
      const alreadyRead = current.legacyReadSectionIds.includes(sectionId)
        && (!resolvedUnitId || current.readUnitIds.includes(resolvedUnitId));
      if (alreadyRead) return current;
      const legacyReadSectionIds = current.legacyReadSectionIds.includes(sectionId)
        ? current.legacyReadSectionIds
        : [...current.legacyReadSectionIds, sectionId];
      return {
        ...current,
        readUnitIds: resolvedUnitId && !current.readUnitIds.includes(resolvedUnitId)
          ? [...current.readUnitIds, resolvedUnitId]
          : current.readUnitIds,
        legacyReadSectionIds,
        readSectionIds: legacyReadSectionIds,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeStorageUserId, currentUserId, recordActivity]);

  const recordModulePractice = useCallback((moduleId: string, correct: boolean, completed: boolean) => {
    if (activeStorageUserId !== currentUserId) return;
    recordActivity();
    setMetrics((current) => {
      const previous = current.modulePractice[moduleId] || { answered: 0, correct: 0, completed: false };
      return {
        ...current,
        modulePractice: {
          ...current.modulePractice,
          [moduleId]: {
            answered: previous.answered + 1,
            correct: previous.correct + (correct ? 1 : 0),
            completed: previous.completed || completed,
          },
        },
        updatedAt: new Date().toISOString(),
      };
    });
  }, [activeStorageUserId, currentUserId, recordActivity]);

  return {
    metrics,
    isLoadingMetrics,
    markModuleVisited,
    markMacroVisited,
    addAttempt,
    markSectionRead,
    recordModulePractice,
    recordActivity,
  };
};
