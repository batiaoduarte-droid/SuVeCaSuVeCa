interface NormalizedQuestion {
  id: string;
  originalQuestionId: string;
  prompt: string;
  options?: Array<{ letter: string; text: string }>;
  correctAnswer?: string;
  commentary?: string;
  bank?: string;
  year?: number;
}

const partCache = new Map<string, Record<string, NormalizedQuestion>>();

export const getLessonPartNumber = (lessonCode: string): string => {
  const num = parseInt(lessonCode.replace(/\D/g, ''), 10);
  if (isNaN(num)) return '001';
  // Mapeamento das 10 partes
  const partIdx = Math.min(10, Math.max(1, Math.floor(num / 2) + 1));
  return String(partIdx).padStart(3, '0');
};

export const fetchNormalizedQuestionsForLesson = async (
  lessonCode: string
): Promise<Record<string, NormalizedQuestion>> => {
  const partNum = getLessonPartNumber(lessonCode);
  if (partCache.has(partNum)) {
    return partCache.get(partNum)!;
  }

  try {
    const res = await fetch(`/knowledge/official-question-parts/official-questions.normalized.part-${partNum}.json`);
    if (res.ok) {
      const data = await res.json();
      const map: Record<string, NormalizedQuestion> = {};
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.originalQuestionId) {
            map[item.originalQuestionId] = item;
          }
          if (item.id) {
            map[item.id] = item;
            // Também mapeia sufixo após os dois pontos ex: A00:aula00.q0002 -> aula00.q0002
            const parts = item.id.split(':');
            if (parts.length > 1) {
              map[parts[1]] = item;
            }
          }
        }
      }
      partCache.set(partNum, map);
      return map;
    }
  } catch {
    // Silencioso em caso de falha de rede
  }

  return {};
};
