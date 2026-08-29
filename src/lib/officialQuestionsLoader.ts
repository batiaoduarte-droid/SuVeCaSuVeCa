import type { QuestionPresentation } from '../types/questionPresentation';

export interface NormalizedQuestion {
  id: string;
  originalQuestionId: string;
  officialQuestionAliases?: string[];
  prompt: string;
  supportText?: string;
  presentation?: QuestionPresentation;
  questionType?: string;
  options?: Array<{ letter: string; text: string }>;
  correctAnswer?: string;
  commentary?: string;
  bank?: string;
  year?: number;
}

interface OfficialQuestionsManifest {
  shards?: Array<{
    questionIds?: string[];
    normalized?: { file?: string };
  }>;
}

const partCache = new Map<string, Record<string, NormalizedQuestion>>();
const shardCache = new Map<string, Promise<Record<string, NormalizedQuestion>>>();
const resolvedShardCache = new Map<string, Record<string, NormalizedQuestion>>();
const lessonShardCache = new Map<string, string[]>();
let manifestPromise: Promise<OfficialQuestionsManifest | null> | null = null;
let presentationFallbackPromise: Promise<Record<string, NormalizedQuestion>> | null = null;

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

const fetchManifest = (): Promise<OfficialQuestionsManifest | null> => {
  if (manifestPromise) return manifestPromise;
  manifestPromise = (async () => {
    try {
      const response = await fetch('/knowledge/official-questions.manifest.json', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json() as OfficialQuestionsManifest;
    } catch {
      return null;
    }
  })();
  return manifestPromise;
};

const fetchPresentationFallbacks = (): Promise<Record<string, NormalizedQuestion>> => {
  if (presentationFallbackPromise) return presentationFallbackPromise;
  presentationFallbackPromise = (async () => {
    try {
      const response = await fetch('/knowledge/official-question-presentation-fallbacks.json', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return {};
      const payload = await response.json() as { presentations?: Record<string, NormalizedQuestion> };
      return payload.presentations || {};
    } catch {
      return {};
    }
  })();
  return presentationFallbackPromise;
};

const resolveNormalizedShardFiles = async (lessonCode: string): Promise<string[]> => {
  if (lessonShardCache.has(lessonCode)) return lessonShardCache.get(lessonCode)!;
  const manifest = await fetchManifest();
  if (manifest) {
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
  // O fallback abaixo preserva compatibilidade com manifests legados.
  const fallback = (LESSON_PARTS_MAP[lessonCode] || ['001'])
    .map((part) => `official-question-parts/official-questions.normalized.part-${part}.json`);
  lessonShardCache.set(lessonCode, fallback);
  return fallback;
};

const addQuestionAliases = (
  map: Record<string, NormalizedQuestion>,
  item: NormalizedQuestion,
) => {
  if (item.originalQuestionId) {
    map[item.originalQuestionId] = item;
  }
  for (const alias of item.officialQuestionAliases || []) {
    map[alias] = item;
    const parsed = parsePBLQuestionRef(alias);
    if (parsed) {
      map[parsed.sourceId] = item;
      map[`${parsed.lessonId}:${parsed.sourceId}`] = item;
    }
  }
  if (!item.id) return;
  map[item.id] = item;
  const separator = item.id.indexOf(':');
  if (separator < 0) return;
  const lessonId = item.id.slice(0, separator).toUpperCase();
  const sourceId = item.id.slice(separator + 1);
  map[sourceId] = item;
  map[`OQ-${lessonId}-${sourceId}`] = item;
};

const fetchNormalizedShard = (
  shardFile: string,
  signal?: AbortSignal,
): Promise<Record<string, NormalizedQuestion>> => {
  const resolved = resolvedShardCache.get(shardFile);
  if (resolved) return Promise.resolve(resolved);
  const cached = signal ? undefined : shardCache.get(shardFile);
  if (cached) return cached;

  const request = (async () => {
    const shardMap: Record<string, NormalizedQuestion> = {};
    try {
      const res = await fetch(`/knowledge/${shardFile}`, {
        headers: { Accept: 'application/json' },
        signal,
      });
      if (!res.ok) return shardMap;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) return shardMap;
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) return shardMap;
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        for (const item of data as NormalizedQuestion[]) {
          addQuestionAliases(shardMap, item);
        }
      }
    } catch {
      // A View publicada continua sendo o fallback seguro quando um shard falha.
    }
    if (!signal?.aborted) resolvedShardCache.set(shardFile, shardMap);
    return shardMap;
  })();
  if (!signal) shardCache.set(shardFile, request);
  return request;
};

const mergeShards = async (
  shardFiles: string[],
  signal?: AbortSignal,
): Promise<Record<string, NormalizedQuestion>> => {
  const combinedMap: Record<string, NormalizedQuestion> = {};
  const shards = await Promise.all(shardFiles.map((file) => fetchNormalizedShard(file, signal)));
  for (const shard of shards) Object.assign(combinedMap, shard);
  return combinedMap;
};

const canonicalQuestionRef = (questionRef: string, lessonCode: string): string => {
  const pblRef = parsePBLQuestionRef(questionRef);
  if (pblRef) return `${pblRef.lessonId}:${pblRef.sourceId}`;
  if (/^A\d{2}:/i.test(questionRef)) {
    const [lessonId, ...sourceParts] = questionRef.split(':');
    return `${lessonId.toUpperCase()}:${sourceParts.join(':')}`;
  }
  return `${lessonCode.toUpperCase()}:${questionRef}`;
};

export const fetchNormalizedQuestionsForLesson = async (
  lessonCode: string
): Promise<Record<string, NormalizedQuestion>> => {
  const code = lessonCode.toUpperCase();
  if (partCache.has(code)) {
    return partCache.get(code)!;
  }

  const shardFiles = await resolveNormalizedShardFiles(code);
  const combinedMap = await mergeShards(shardFiles);

  partCache.set(code, combinedMap);
  return combinedMap;
};

/**
 * Carrega somente os shards que contêm as questões que serão montadas na tela.
 * Se o manifest não estiver disponível, preserva o fallback legado por aula.
 */
export const fetchNormalizedQuestionsByRefs = async (
  questionRefs: string[],
  lessonCode: string,
  signal?: AbortSignal,
): Promise<Record<string, NormalizedQuestion>> => {
  if (questionRefs.length === 0) return {};
  const code = lessonCode.toUpperCase();
  const requestedIds = new Set(questionRefs.map((ref) => canonicalQuestionRef(ref, code)));
  const manifest = await fetchManifest();
  if (!manifest) return fetchNormalizedQuestionsForLesson(code);

  const shardFiles = (manifest.shards || [])
    .filter((shard) => (shard.questionIds || []).some((id) => requestedIds.has(id)))
    .map((shard) => shard.normalized?.file)
    .filter((file): file is string => Boolean(file));

  const resolvedFiles = shardFiles.length === 0
    ? await resolveNormalizedShardFiles(code)
    : [...new Set(shardFiles)];
  const combined = await mergeShards(resolvedFiles, signal);
  const unresolvedRefs = questionRefs.filter((questionRef) => {
    const canonical = canonicalQuestionRef(questionRef, code);
    return !combined[questionRef] && !combined[canonical];
  });
  if (unresolvedRefs.length === 0) return combined;
  const fallbacks = await fetchPresentationFallbacks();
  for (const questionRef of unresolvedRefs) {
    const canonical = canonicalQuestionRef(questionRef, code);
    const alreadyResolved = combined[questionRef] || combined[canonical];
    if (alreadyResolved) continue;
    const parsed = parsePBLQuestionRef(questionRef);
    const fallback = fallbacks[questionRef]
      || (parsed ? fallbacks[`OQ-${parsed.lessonId}-${parsed.sourceId}`] : undefined);
    if (!fallback) continue;
    addQuestionAliases(combined, fallback);
    combined[questionRef] = fallback;
    combined[canonical] = fallback;
  }
  return combined;
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
