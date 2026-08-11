import { access, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { formatOfficialContent } from './officialContent';

type JsonRecord = Record<string, unknown>;

export interface OfficialQuestionIndexItem {
  questionId: string;
  officialHashSha256: string;
  officialProjection: {
    difficulty: string;
    answerType: string;
    correctAnswer: string;
    topicIds: string[];
    topicNames: string[];
    banks: string[];
    years: number[];
    examIds: string[];
    hasTextSolution: boolean;
    hasVideoSolution: boolean;
  };
  suvecaDerived: {
    moduleIds: string[];
    conceptIds: string[];
  };
}

export interface OfficialQuestionFilters {
  moduleId?: string;
  conceptId?: string;
  topic?: string;
  bank?: string;
  year?: number;
  difficulty?: string;
  query?: string;
}

interface QuestionStore {
  rawById: Map<string, JsonRecord>;
  normalizedById: Map<string, JsonRecord>;
  index: OfficialQuestionIndexItem[];
  indexById: Map<string, OfficialQuestionIndexItem>;
  buildId: string;
  source: 'monolithic' | 'sharded';
  sourceLocation: string;
  rawTotal: number;
  normalizedTotal: number;
  ensureQuestionLoaded: (questionId: string) => Promise<void>;
  ensureAllLoaded: () => Promise<void>;
}

interface ShardDescriptor {
  part: number;
  count: number;
  questionIds: string[];
  raw: { file: string; bytes: number; sha256: string };
  normalized: { file: string; bytes: number; sha256: string };
}

interface OfficialQuestionManifest {
  buildId: string;
  expectedTotal: number;
  totals: { raw: number; normalized: number; indexed: number; uniqueQuestionIds: number; shards: number };
  shards: ShardDescriptor[];
}

const normalize = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const fileExists = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const knowledgeCandidates = () => {
  const cwd = process.cwd();
  const executableDirectory = path.dirname(path.resolve(process.argv[1] || '.'));
  const entries = [
    ...(process.env.SUVECA_KNOWLEDGE_DIR
      ? [{ directory: path.resolve(process.env.SUVECA_KNOWLEDGE_DIR), label: 'configured/knowledge' }]
      : []),
    { directory: path.join(cwd, 'public', 'knowledge'), label: 'public/knowledge' },
    { directory: path.join(cwd, 'dist', 'knowledge'), label: 'dist/knowledge' },
    { directory: path.join(cwd, 'applet', 'public', 'knowledge'), label: 'applet/public/knowledge' },
    { directory: path.join(cwd, 'applet', 'dist', 'knowledge'), label: 'applet/dist/knowledge' },
    { directory: path.join(executableDirectory, 'knowledge'), label: 'runtime/knowledge' },
    { directory: path.resolve(executableDirectory, '..', 'public', 'knowledge'), label: 'runtime/../public/knowledge' },
    { directory: path.resolve(executableDirectory, '..', 'dist', 'knowledge'), label: 'runtime/../dist/knowledge' },
  ];
  return entries.filter((entry, index) => entries.findIndex((candidate) => candidate.directory === entry.directory) === index);
};

const resolveKnowledgeSource = async () => {
  const checked: string[] = [];
  for (const candidate of knowledgeCandidates()) {
    checked.push(candidate.label);
    if (!await fileExists(path.join(candidate.directory, 'official-question-index.json'))) continue;
    const [rawExists, normalizedExists, manifestExists] = await Promise.all([
      fileExists(path.join(candidate.directory, 'official-questions.raw.json')),
      fileExists(path.join(candidate.directory, 'official-questions.normalized.json')),
      fileExists(path.join(candidate.directory, 'official-questions.manifest.json')),
    ]);
    if (rawExists && normalizedExists) return { ...candidate, mode: 'monolithic' as const };
    if (manifestExists) return { ...candidate, mode: 'sharded' as const };
  }
  throw new Error(`Artefatos oficiais indisponíveis. Locais verificados: ${checked.join(', ')}.`);
};

const safeShardPath = (directory: string, relativeFile: string) => {
  const resolved = path.resolve(directory, relativeFile);
  if (!resolved.startsWith(`${path.resolve(directory)}${path.sep}`)) throw new Error(`Caminho de shard inválido: ${relativeFile}`);
  return resolved;
};

const readVerifiedShard = async (directory: string, descriptor: { file: string; bytes: number; sha256: string }) => {
  const buffer = await readFile(safeShardPath(directory, descriptor.file));
  if (buffer.length !== descriptor.bytes) throw new Error(`Tamanho divergente em ${descriptor.file}.`);
  if (sha256(buffer) !== descriptor.sha256) throw new Error(`SHA-256 divergente em ${descriptor.file}.`);
  const parsed = JSON.parse(buffer.toString('utf8')) as JsonRecord[];
  if (!Array.isArray(parsed)) throw new Error(`Shard inválido: ${descriptor.file}.`);
  return parsed;
};

const validateMonolithicInputs = (
  raw: JsonRecord[],
  normalized: JsonRecord[],
  indexPayload: { buildId: string; items: OfficialQuestionIndexItem[] },
) => {
  if (!Array.isArray(raw) || raw.length !== 372) throw new Error(`Corpus bruto incompleto: ${raw?.length || 0}/372.`);
  if (!Array.isArray(normalized) || normalized.length !== 372) throw new Error(`Corpus normalizado incompleto: ${normalized?.length || 0}/372.`);
  if (!Array.isArray(indexPayload.items) || indexPayload.items.length !== 372) throw new Error(`Índice oficial incompleto: ${indexPayload.items?.length || 0}/372.`);
  const rawIds = raw.map((question) => String(question.id || ''));
  const normalizedIds = normalized.map((question) => String(question.id || ''));
  const indexIds = indexPayload.items.map((item) => String(item.questionId || ''));
  for (const [label, ids] of [['bruto', rawIds], ['normalizado', normalizedIds], ['índice', indexIds]] as const) {
    if (ids.some((id) => !id)) throw new Error(`O conjunto ${label} contém ID vazio.`);
    if (new Set(ids).size !== 372) throw new Error(`O conjunto ${label} não possui 372 IDs únicos.`);
  }
  if (JSON.stringify(rawIds) !== JSON.stringify(normalizedIds)) throw new Error('A ordem dos IDs brutos e normalizados diverge.');
  if (indexIds.some((id) => !rawIds.includes(id))) throw new Error('O índice referencia questões ausentes do payload oficial.');
};

let storePromise: Promise<QuestionStore> | null = null;
export const resetOfficialQuestionStoreForTests = () => {
  storePromise = null;
};
const loadStore = async (): Promise<QuestionStore> => {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    const source = await resolveKnowledgeSource();
    const indexText = await readFile(path.join(source.directory, 'official-question-index.json'), 'utf8');
    const indexPayload = JSON.parse(indexText) as { buildId: string; items: OfficialQuestionIndexItem[] };
    let raw: JsonRecord[] = [];
    let normalized: JsonRecord[] = [];
    if (source.mode === 'monolithic') {
      const [rawText, normalizedText] = await Promise.all([
        readFile(path.join(source.directory, 'official-questions.raw.json'), 'utf8'),
        readFile(path.join(source.directory, 'official-questions.normalized.json'), 'utf8'),
      ]);
      raw = JSON.parse(rawText) as JsonRecord[];
      normalized = JSON.parse(normalizedText) as JsonRecord[];
    }
    const rawById = new Map<string, JsonRecord>();
    const normalizedById = new Map<string, JsonRecord>();
    let ensureQuestionLoaded: (questionId: string) => Promise<void>;
    let ensureAllLoaded: () => Promise<void>;

    if (source.mode === 'monolithic') {
      validateMonolithicInputs(raw, normalized, indexPayload);
      raw.forEach((question) => rawById.set(String(question.id), question));
      normalized.forEach((question) => normalizedById.set(String(question.id), question));
      ensureQuestionLoaded = async () => undefined;
      ensureAllLoaded = async () => undefined;
    } else {
      const manifest = JSON.parse(await readFile(path.join(source.directory, 'official-questions.manifest.json'), 'utf8')) as OfficialQuestionManifest;
      if (manifest.expectedTotal !== 372 || manifest.buildId !== indexPayload.buildId) throw new Error('Manifesto oficial incompativel com o indice versionado.');
      if (!Array.isArray(manifest.shards) || manifest.shards.length !== manifest.totals.shards) throw new Error('Manifesto oficial possui shards inconsistentes.');
      if (manifest.totals.raw !== 372 || manifest.totals.normalized !== 372 || manifest.totals.indexed !== 372 || manifest.totals.uniqueQuestionIds !== 372) {
        throw new Error('Manifesto oficial nao declara 372 registros integros.');
      }
      if (!Array.isArray(indexPayload.items) || indexPayload.items.length !== 372 || new Set(indexPayload.items.map((item) => item.questionId)).size !== 372) {
        throw new Error('Indice oficial incompleto ou duplicado.');
      }

      const questionToShard = new Map<string, ShardDescriptor>();
      for (const shard of manifest.shards) {
        if (shard.questionIds.length !== shard.count) throw new Error(`Contagem de IDs divergente no shard ${shard.part}.`);
        for (const questionId of shard.questionIds) {
          if (questionToShard.has(questionId)) throw new Error(`ID duplicado no manifesto: ${questionId}.`);
          questionToShard.set(questionId, shard);
        }
      }
      if (questionToShard.size !== 372 || indexPayload.items.some((item) => !questionToShard.has(item.questionId))) {
        throw new Error('Manifesto e indice oficial possuem conjuntos de IDs divergentes.');
      }

      const shardPromises = new Map<number, Promise<void>>();
      const loadShard = (shard: ShardDescriptor) => {
        const existing = shardPromises.get(shard.part);
        if (existing) return existing;
        const loading = Promise.all([
          readVerifiedShard(source.directory, shard.raw),
          readVerifiedShard(source.directory, shard.normalized),
        ]).then(([rawPart, normalizedPart]) => {
          if (rawPart.length !== shard.count || normalizedPart.length !== shard.count) throw new Error(`Contagem divergente no shard ${shard.part}.`);
          if (JSON.stringify(rawPart.map((item) => String(item.id))) !== JSON.stringify(shard.questionIds)) throw new Error(`IDs brutos divergentes no shard ${shard.part}.`);
          if (JSON.stringify(normalizedPart.map((item) => String(item.id))) !== JSON.stringify(shard.questionIds)) throw new Error(`IDs normalizados divergentes no shard ${shard.part}.`);
          rawPart.forEach((question) => rawById.set(String(question.id), question));
          normalizedPart.forEach((question) => normalizedById.set(String(question.id), question));
        }).catch((error) => {
          shardPromises.delete(shard.part);
          throw error;
        });
        shardPromises.set(shard.part, loading);
        return loading;
      };
      ensureQuestionLoaded = async (questionId) => {
        if (rawById.has(questionId) && normalizedById.has(questionId)) return;
        const shard = questionToShard.get(questionId);
        if (shard) await loadShard(shard);
      };
      ensureAllLoaded = async () => {
        await Promise.all(manifest.shards.map(loadShard));
      };
    }

    return {
      rawById,
      normalizedById,
      index: indexPayload.items,
      indexById: new Map(indexPayload.items.map((item) => [item.questionId, item])),
      buildId: indexPayload.buildId,
      source: source.mode,
      sourceLocation: source.label,
      rawTotal: source.mode === 'monolithic' ? raw.length : 372,
      normalizedTotal: source.mode === 'monolithic' ? normalized.length : 372,
      ensureQuestionLoaded,
      ensureAllLoaded,
    };
  })().catch((error) => {
    storePromise = null;
    throw error;
  });
  return storePromise;
};

export async function getOfficialQuestionStoreHealth() {
  const store = await loadStore();
  return {
    expected: 372,
    raw: store.rawTotal,
    normalized: store.normalizedTotal,
    indexed: store.index.length,
    uniqueIds: store.indexById.size,
    buildId: store.buildId,
    source: store.source,
    location: store.sourceLocation,
  };
}

const matchesFilters = (item: OfficialQuestionIndexItem, filters: OfficialQuestionFilters) => {
  if (filters.moduleId && !item.suvecaDerived.moduleIds.includes(filters.moduleId)) return false;
  if (filters.conceptId && !item.suvecaDerived.conceptIds.includes(filters.conceptId)) return false;
  if (filters.year && !item.officialProjection.years.includes(filters.year)) return false;
  if (filters.difficulty && normalize(item.officialProjection.difficulty) !== normalize(filters.difficulty)) return false;
  if (
    filters.topic
    && !item.officialProjection.topicNames.some((topic) => normalize(topic).includes(normalize(filters.topic)))
    && !item.officialProjection.topicIds.includes(filters.topic)
  ) return false;
  if (filters.bank && !item.officialProjection.banks.some((bank) => normalize(bank).includes(normalize(filters.bank)))) return false;
  return true;
};

const textualScore = (raw: JsonRecord | undefined, item: OfficialQuestionIndexItem, query = '') => {
  const terms = normalize(query).split(/\s+/).filter((term) => term.length > 2);
  if (!terms.length) return 0;
  const solution = raw?.solution as JsonRecord | undefined;
  const haystack = normalize([
    raw?.statement_text,
    ...item.officialProjection.topicNames,
    ...item.officialProjection.banks,
    solution?.sanitized_complete,
  ].join(' '));
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
};

export async function queryOfficialQuestions(
  filters: OfficialQuestionFilters,
  options: { offset?: number; limit?: number } = {},
) {
  const store = await loadStore();
  if (filters.query) await store.ensureAllLoaded();
  const offset = Math.max(0, options.offset || 0);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const filtered = store.index
    .filter((item) => matchesFilters(item, filters))
    .map((item) => ({ item, score: filters.query ? textualScore(store.rawById.get(item.questionId), item, filters.query) : 0 }))
    .filter(({ score }) => !filters.query || score > 0)
    .sort((left, right) => right.score - left.score || left.item.questionId.localeCompare(right.item.questionId));
  return {
    buildId: store.buildId,
    total: filtered.length,
    offset,
    limit,
    items: filtered.slice(offset, offset + limit).map(({ item }) => item),
  };
}

export async function getOfficialQuestion(questionId: string) {
  const store = await loadStore();
  const id = String(questionId);
  await store.ensureQuestionLoaded(id);
  const raw = store.rawById.get(id);
  const normalized = store.normalizedById.get(id);
  const index = store.indexById.get(id);
  if (!raw || !normalized || !index) return null;
  return {
    questionId: id,
    provenance: {
      kind: 'official_question',
      officialPayloadPolicy: 'immutable',
      buildId: store.buildId,
      officialHashSha256: index.officialHashSha256,
    },
    official: { raw, normalized },
    suvecaDerived: index.suvecaDerived,
  };
}

export async function sampleOfficialQuestions(filters: OfficialQuestionFilters, count = 10) {
  const result = await queryOfficialQuestions(filters, { limit: 100 });
  const pool = [...result.items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  const selected = pool.slice(0, Math.min(50, Math.max(1, count)));
  return Promise.all(selected.map((item) => getOfficialQuestion(item.questionId)));
}

export async function formatOfficialQuestionContext(query: string, limit = 2) {
  const store = await loadStore();
  const result = await queryOfficialQuestions({ query }, { limit });
  const blocks = result.items.map((item) => {
    const raw = store.rawById.get(item.questionId);
    const solution = raw?.solution as JsonRecord | undefined;
    const statement = formatOfficialContent(raw?.statement || raw?.statement_text);
    const commentary = formatOfficialContent(solution?.complete_html || solution?.complete || solution?.sanitized_complete);
    return [
      `[QUESTION:${item.questionId}]`,
      `Tópicos oficiais: ${item.officialProjection.topicNames.join(' > ')}`,
      `Banca/ano: ${item.officialProjection.banks.join(', ') || 'não identificado'} / ${item.officialProjection.years.join(', ') || 'não identificado'}`,
      `Enunciado — trecho literal: ${statement.slice(0, 1400)}${statement.length > 1400 ? ' […]' : ''}`,
      `Solução — trecho literal: ${commentary.slice(0, 1800)}${commentary.length > 1800 ? ' […]' : ''}`,
    ].join('\n');
  });
  if (!blocks.length) return '';
  return `QUESTÕES OFICIAIS RELACIONADAS (conteúdo literal, imutável; não corrigir nem atribuir à SuVeCA):\n\n${blocks.join('\n\n')}`;
}
