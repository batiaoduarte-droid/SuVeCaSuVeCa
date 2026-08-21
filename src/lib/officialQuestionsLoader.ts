export interface NormalizedQuestion {
  id: string;
  originalQuestionId: string;
  prompt: string;
  questionType?: string;
  options?: Array<{ letter: string; text: string }>;
  correctAnswer?: string;
  commentary?: string;
  bank?: string;
  year?: number;
}

const partCache = new Map<string, Record<string, NormalizedQuestion>>();

const LESSON_PARTS_MAP: Record<string, string[]> = {
  A00: ['001'],
  A01: ['001', '002'],
  A02: ['002', '003'],
  A03: ['003'],
  A04: ['003', '004'],
  A05: ['004'],
  A06: ['004', '005'],
  A07: ['005'],
  A08: ['005', '006'],
  A09: ['006', '007'],
  A10: ['007', '008'],
  A11: ['008'],
  A12: ['008', '009'],
  A13: ['009', '010'],
};

export const fetchNormalizedQuestionsForLesson = async (
  lessonCode: string
): Promise<Record<string, NormalizedQuestion>> => {
  const code = lessonCode.toUpperCase();
  if (partCache.has(code)) {
    return partCache.get(code)!;
  }

  const parts = LESSON_PARTS_MAP[code] || ['001'];
  const combinedMap: Record<string, NormalizedQuestion> = {};

  for (const partNum of parts) {
    try {
      const res = await fetch(`/knowledge/official-question-parts/official-questions.normalized.part-${partNum}.json`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.originalQuestionId) {
              combinedMap[item.originalQuestionId] = item;
            }
            if (item.id) {
              combinedMap[item.id] = item;
              const subparts = item.id.split(':');
              if (subparts.length > 1) {
                combinedMap[subparts[1]] = item;
              }
            }
          }
        }
      }
    } catch {
      // Silencioso em caso de falha de rede
    }
  }

  partCache.set(code, combinedMap);
  return combinedMap;
};

export const parsePBLQuestionRef = (questionRef: string): { lessonId: string; sourceId: string } | null => {
  const match = /^OQ-(A\d{2})-(.+)$/i.exec(questionRef);
  if (!match) return null;
  return { lessonId: match[1].toUpperCase(), sourceId: match[2] };
};

export const fetchNormalizedQuestion = async (
  questionRef: string
): Promise<NormalizedQuestion | null> => {
  const parsed = parsePBLQuestionRef(questionRef);
  if (!parsed) return null;
  const map = await fetchNormalizedQuestionsForLesson(parsed.lessonId);
  return (
    map[questionRef] ||
    map[`${parsed.lessonId}:${parsed.sourceId}`] ||
    map[parsed.sourceId] ||
    null
  );
};
