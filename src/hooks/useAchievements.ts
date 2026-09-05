import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, type User } from '../lib/firebase';
import {
  EMPTY_ACHIEVEMENT_PROGRESS,
  hasNewUnlock,
  normalizeAchievementProgress,
  recordAnswerResult,
  recordFlashcardCorrect as recordFlashcardCorrectInProgress,
  recordStudyActivity as recordStudyActivityInProgress,
  recordStudyNote,
  type AchievementId,
  type AchievementProgress,
} from '../lib/achievements';

const LEGACY_STORAGE_KEY = 'suveca_achievement_progress';

const storageKeyFor = (userId?: string | null) =>
  userId
    ? `suveca_achievement_progress_${userId}`
    : 'suveca_achievement_progress_guest';

const emptyProgress = (): AchievementProgress => ({
  ...EMPTY_ACHIEVEMENT_PROGRESS,
  unlocked: {},
});

const readLocalProgress = (userId?: string | null): AchievementProgress => {
  try {
    const saved = localStorage.getItem(storageKeyFor(userId));
    // The legacy key was shared by every browser session. It is safe to offer
    // it only to the anonymous profile, never to a newly signed-in user.
    const legacyGuestProgress = !userId
      ? localStorage.getItem(LEGACY_STORAGE_KEY)
      : null;
    const value = saved || legacyGuestProgress;
    return value ? normalizeAchievementProgress(JSON.parse(value)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
};

interface UseAchievementsOptions {
  onUnlock?: (achievementId: AchievementId) => void;
}

export const useAchievements = (
  user?: User | null,
  options: UseAchievementsOptions = {}
) => {
  const currentUserId = user?.uid || null;
  const [progress, setProgress] = useState<AchievementProgress>(() =>
    readLocalProgress(null)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [activeStorageUserId, setActiveStorageUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const localProgress = readLocalProgress(currentUserId);

    // Switch the in-memory state before a cloud read. This keeps browser data
    // belonging to another account out of the next account's session.
    setProgress(localProgress);
    setActiveStorageUserId(currentUserId);
    setLoadedUserId(null);

    if (!currentUserId) {
      setIsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setIsLoading(true);
    setLoadedUserId(null);

    const loadProgress = async () => {
      try {
        const achievementRef = doc(db, 'users', currentUserId, 'data', 'achievements');
        const snapshot = await getDoc(achievementRef);

        if (cancelled) return;

        if (snapshot.exists()) {
          setProgress(normalizeAchievementProgress(snapshot.data()));
        }
      } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
      } finally {
        if (!cancelled) {
          setLoadedUserId(currentUserId);
          setIsLoading(false);
        }
      }
    };

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (activeStorageUserId !== currentUserId) return;

    localStorage.setItem(storageKeyFor(currentUserId), JSON.stringify(progress));

    if (!currentUserId || loadedUserId !== currentUserId) return;

    const saveTimer = window.setTimeout(() => {
      const dataToSave: Record<string, unknown> = {
        currentStreak: progress.currentStreak,
        bestStreak: progress.bestStreak,
        flashcardCorrectCount: progress.flashcardCorrectCount,
        studyStreak: progress.studyStreak,
        longestStudyStreak: progress.longestStudyStreak,
        unlocked: progress.unlocked || {},
        updatedAt: new Date().toISOString(),
      };
      if (progress.lastStudyDate !== undefined) {
        dataToSave.lastStudyDate = progress.lastStudyDate;
      }

      void setDoc(
        doc(db, 'users', currentUserId, 'data', 'achievements'),
        dataToSave,
        { merge: true }
      ).catch((error) => {
        console.error('Erro ao salvar conquistas:', error);
      });
    }, 450);

    return () => window.clearTimeout(saveTimer);
  }, [activeStorageUserId, currentUserId, loadedUserId, progress]);

  const applyProgress = useCallback(
    (updater: (current: AchievementProgress) => AchievementProgress) => {
      const hasLoadedCurrentUser =
        activeStorageUserId === currentUserId &&
        (!currentUserId || loadedUserId === currentUserId);
      if (!hasLoadedCurrentUser) return;

      setProgress((current) => {
        const next = updater(current);
        const newUnlock = hasNewUnlock(current, next);
        if (newUnlock) options.onUnlock?.(newUnlock);
        return next;
      });
    },
    [activeStorageUserId, currentUserId, loadedUserId, options.onUnlock]
  );

  const recordNote = useCallback(() => {
    applyProgress((current) => recordStudyNote(current));
  }, [applyProgress]);

  const recordAnswer = useCallback(
    (isCorrect: boolean) => {
      // Defesa em runtime para integrações legadas: um objeto é truthy e
      // anteriormente podia transformar qualquer erro PBL em acerto de streak.
      if (typeof isCorrect !== 'boolean') {
        console.warn('[useAchievements] Resultado ignorado: esperava booleano.');
        return;
      }
      applyProgress((current) => recordAnswerResult(current, isCorrect));
    },
    [applyProgress]
  );

  const recordStudyActivity = useCallback(() => {
    applyProgress((current) => recordStudyActivityInProgress(current));
  }, [applyProgress]);

  const recordFlashcardCorrect = useCallback(() => {
    applyProgress((current) => recordFlashcardCorrectInProgress(current));
  }, [applyProgress]);

  return {
    progress,
    isLoading,
    isReady: activeStorageUserId === currentUserId &&
      (!currentUserId || loadedUserId === currentUserId),
    recordNote,
    recordAnswer,
    recordStudyActivity,
    recordFlashcardCorrect,
  };
};
