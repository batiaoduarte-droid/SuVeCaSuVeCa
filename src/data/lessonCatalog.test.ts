import { describe, expect, it } from 'vitest';
import { formatLessonRange, getLessonEntry, getLessonName, LESSON_CATALOG, normalizeLessonId } from './lessonCatalog';

describe('lessonCatalog', () => {
  it('cobre uma única vez todas as aulas A00–A14', () => {
    expect(LESSON_CATALOG).toHaveLength(15);
    expect(new Set(LESSON_CATALOG.map((entry) => entry.lessonId)).size).toBe(15);
    expect(LESSON_CATALOG.map((entry) => entry.lessonId)).toEqual(
      Array.from({ length: 15 }, (_, index) => `A${String(index).padStart(2, '0')}`),
    );
  });

  it('normaliza IDs sem expor o formato técnico como rótulo', () => {
    expect(normalizeLessonId('mod3')).toBe('A03');
    expect(normalizeLessonId('3')).toBe('A03');
    expect(getLessonEntry('A10')?.moduleId).toBe('mod10');
    expect(getLessonName('A00')).toBe('Ortografia e fonologia');
  });

  it('descreve intervalos com nomes curriculares', () => {
    expect(formatLessonRange('A00', 'A00')).toBe('Ortografia e fonologia');
    expect(formatLessonRange('A00', 'A02')).toBe('Ortografia e fonologia até Classes de palavras II');
  });
});
