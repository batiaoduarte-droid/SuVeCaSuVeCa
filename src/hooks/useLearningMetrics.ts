import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, type User } from '../lib/firebase';
import type { LearningAttempt } from '../components/StatisticsDashboard';

export interface LearningMetrics {
  attempts: LearningAttempt[];
  visitedModuleIds: string[];
  updatedAt?: string;
}

const LEGACY_STORAGE_KEY = 'suveca_learning_metrics';
const EMPTY_METRICS: LearningMetrics = { attempts: [], visitedModuleIds: [] };

const storageKeyFor = (userId?: string | null) =>
  userId ? `suveca_learning_metrics_${userId}` : 'suveca_learning_metrics_guest';

const readLocalMetrics = (userId?: string | null): LearningMetrics => {
  try {
    // A legacy shared cache is available only to the guest profile; it must
    // never seed a different signed-in user's private document.
    const stored =
      localStorage.getItem(storageKeyFor(userId)) ||
      (!userId ? localStorage.getItem(LEGACY_STORAGE_KEY) : null);
    if (!stored) return EMPTY_METRICS;
    const parsed = JSON.parse(stored) as Partial<LearningMetrics>;
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
      visitedModuleIds: Array.isArray(parsed.visitedModuleIds) ? parsed.visitedModuleIds : [],
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
  return {
    attempts: Array.isArray(data.attempts) ? data.attempts : [],
    visitedModuleIds: Array.isArray(data.visitedModuleIds) ? data.visitedModuleIds : [],
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
    attempts,
    visitedModuleIds: [...new Set([...local.visitedModuleIds, ...cloud.visitedModuleIds])],
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
        const metricsRef = doc(db, 'users', user.uid, 'data', 'learning_metrics');
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
        doc(db, 'users', currentUserId, 'data', 'learning_metrics'),
        { ...metrics, updatedAt: new Date().toISOString() },
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

  const addAttempt = useCallback((attempt: LearningAttempt) => {
    if (!attempt?.id) return;
    if (activeStorageUserId !== currentUserId) return;
    recordActivity();

    const { answerMap, questionSetVersion, ...attemptSummary } = attempt;
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
      questionSetVersion === 'official-simulado-v1' &&
      answerMap &&
      Object.keys(answerMap).length > 0
    ) {
      void setDoc(
        doc(db, 'users', currentUserId, 'attempt_submissions', attempt.id),
        {
          schemaVersion: 1,
          questionSetVersion,
          answerMap,
          clientCompletedAt: attempt.completedAt || new Date().toISOString(),
          submittedAtClient: new Date().toISOString(),
        }
      ).catch((error) =>
        console.error('Erro ao enviar tentativa para validação do ranking:', error)
      );
    }
  }, [activeStorageUserId, currentUserId, recordActivity]);

  return {
    metrics,
    isLoadingMetrics,
    markModuleVisited,
    addAttempt,
    recordActivity,
  };
};
