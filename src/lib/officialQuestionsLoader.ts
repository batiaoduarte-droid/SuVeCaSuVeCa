export interface NormalizedQuestion {
  id: string;
  originalQuestionId: string;
  prompt: string;
  supportText?: string;
  questionType?: string;
  options?: Array<{ letter: string; text: string }>;
  correctAnswer?: string;
  commentary?: string;
  bank?: string;
  year?: number;
}

const partCache = new Map<string, Record<string, NormalizedQuestion>>();
const lessonShardCache = new Map<string, string[]>();

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

const resolveNormalizedShardFiles = async (lessonCode: string): Promise<string[]> => {
  if (lessonShardCache.has(lessonCode)) return lessonShardCache.get(lessonCode)!;
  try {
    const response = await fetch('/knowledge/official-questions.manifest.json', {
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const manifest = await response.json() as {
        shards?: Array<{ questionIds?: string[]; normalized?: { file?: string } }>;
      };
      const prefix = `${lessonCode}:`;
      const files = (manifest.shards || [])
        .filter((shard) => (shard.questionIds || []).some((id) => id.startsWith(prefix)))
        .map((shard) => shard.normalized?.file)
        .filter((file): file is string => Boolean(file));
      if (files.length > 0) {
        lessonShardCache.set(lessonCode, files);
        return files;
      }
    }
  } catch {
    // O fallback abaixo preserva compatibilidade com manifests legados.
  }
  const fallback = (LESSON_PARTS_MAP[lessonCode] || ['001'])
    .map((part) => `official-question-parts/official-questions.normalized.part-${part}.json`);
  lessonShardCache.set(lessonCode, fallback);
  return fallback;
};

export const fetchNormalizedQuestionsForLesson = async (
  lessonCode: string
): Promise<Record<string, NormalizedQuestion>> => {
  const code = lessonCode.toUpperCase();
  if (partCache.has(code)) {
    return partCache.get(code)!;
  }

  const shardFiles = await resolveNormalizedShardFiles(code);
  const combinedMap: Record<string, NormalizedQuestion> = {};

  for (const shardFile of shardFiles) {
    try {
      const res = await fetch(`/knowledge/${shardFile}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) continue;
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) continue;
      const data = JSON.parse(text);
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
    } catch {
      // Silencioso em caso de falha de rede ou parsing
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
