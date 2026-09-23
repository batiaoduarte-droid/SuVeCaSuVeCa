import { fetchPublishedJson, publishedUrl, type PublishedFile } from './publishedData';
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
  shards: Array<{ questionIds: string[]; normalized: PublishedFile }>;
}
const fetchManifest = async (): Promise<OfficialQuestionsManifest> => {
  const manifest = await fetchPublishedJson<OfficialQuestionsManifest>('/knowledge/official-questions.manifest.json');
  if (!Array.isArray(manifest.shards) || !manifest.shards.length || manifest.shards.some(s => !s.normalized?.sha256 || !Array.isArray(s.questionIds))) throw new Error('Manifesto obrigatório de questões inválido.');
  return manifest;
};
const fetchPresentationFallbacks = async (): Promise<Record<string, NormalizedQuestion>> => {
  const payload = await fetchPublishedJson<{ presentations: Record<string, NormalizedQuestion> }>('/knowledge/official-question-presentation-fallbacks.json');
  if (!payload.presentations) throw new Error('Projeções de apresentação ausentes.');
  return payload.presentations;
};

export const addQuestionAliases = (
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

const mergeShards = async (
  descriptors: PublishedFile[], signal?: AbortSignal,
): Promise<Record<string, NormalizedQuestion>> => {
  const combined: Record<string, NormalizedQuestion> = {};
  const shards = await Promise.all(descriptors.map(d => fetchPublishedJson<NormalizedQuestion[]>(publishedUrl('/knowledge', d.file), d, signal)));
  for (const records of shards) {
    if (!Array.isArray(records)) throw new Error('Fragmento de questões inválido.');
    for (const item of records) addQuestionAliases(combined, item);
  }
  return combined;
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

export const fetchNormalizedQuestionsForLesson = async (lessonCode: string): Promise<Record<string, NormalizedQuestion>> => {
  const manifest = await fetchManifest();
  return mergeShards(manifest.shards.filter(s => s.questionIds.some(id => id.startsWith(lessonCode.toUpperCase() + ':'))).map(s => s.normalized));
};

export const fetchNormalizedQuestionsByRefs = async (
  questionRefs: string[],
  lessonCode: string,
  signal?: AbortSignal,
): Promise<Record<string, NormalizedQuestion>> => {
  if (questionRefs.length === 0) return {};
  const code = lessonCode.toUpperCase();
  const requestedIds = new Set(questionRefs.map((ref) => canonicalQuestionRef(ref, code)));
  const manifest = await fetchManifest();
  const descriptors = manifest.shards
    .filter(shard => shard.questionIds.some(id => requestedIds.has(id)))
    .map(shard => shard.normalized);
  const combined = await mergeShards(descriptors, signal);
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
  const map = await fetchNormalizedQuestionsByRefs([questionRef], parsed.lessonId);
  return (
    map[questionRef] ||
    map[`${parsed.lessonId}:${parsed.sourceId}`] ||
    map[parsed.sourceId] ||
    null
  );
};
