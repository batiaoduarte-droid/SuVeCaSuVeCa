import { describe, expect, it } from 'vitest';
import {
  EMPTY_ACHIEVEMENT_PROGRESS,
  normalizeAchievementProgress,
  recordFlashcardCorrect,
} from './achievements';
import { calculateMasteryProgress, FLASHCARD_CORRECT_XP } from './masteryLevel';

describe('XP de flashcards', () => {
  it('migra progresso antigo sem inventar acertos de flashcards', () => {
    const normalized = normalizeAchievementProgress({
      currentStreak: 2,
      bestStreak: 4,
      unlocked: {},
    });

    expect(normalized.flashcardCorrectCount).toBe(0);
  });

  it('registra cada acerto sem alterar a sequência de questões', () => {
    const progress = recordFlashcardCorrect({
      ...EMPTY_ACHIEVEMENT_PROGRESS,
      currentStreak: 3,
      bestStreak: 5,
    });

    expect(progress.flashcardCorrectCount).toBe(1);
    expect(progress.currentStreak).toBe(3);
    expect(progress.bestStreak).toBe(5);
  });

  it('soma o XP dos acertos e o expõe no detalhamento do perfil', () => {
    const result = calculateMasteryProgress({ flashcardCorrectCount: 3 });
    const flashcards = result.breakdown.find((item) => item.category === 'Flashcards');

    expect(FLASHCARD_CORRECT_XP).toBe(10);
    expect(result.totalXp).toBe(30);
    expect(flashcards).toMatchObject({ xp: 30, count: 3, unit: 'acertos' });
  });
});
