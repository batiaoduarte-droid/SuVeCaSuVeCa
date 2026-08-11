import { access, readFile } from 'node:fs/promises';
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
}

const normalize = (value: unknown) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('pt-BR');

const resolveKnowledgeDir = async () => {
  const candidates = [
    path.join(process.cwd(), 'public', 'knowledge'),
    path.join(process.cwd(), 'dist', 'knowledge'),
  ];
  for (const candidate of candidates) {
    try {
      await access(path.join(candidate, 'official-questions.raw.json'));
      return candidate;
    } catch {
      // Try the next build layout.
    }
  }
  throw new Error('Artefatos do corpus oficial de questões não foram encontrados. Execute npm run kb:build.');
};

let storePromise: Promise<QuestionStore> | null = null;
const loadStore = async (): Promise<QuestionStore> => {
  if (storePromise) return storePromise;
  storePromise = (async () => {
    const directory = await resolveKnowledgeDir();
    const [rawText, normalizedText, indexText] = await Promise.all([
      readFile(path.join(directory, 'official-questions.raw.json'), 'utf8'),
      readFile(path.join(directory, 'official-questions.normalized.json'), 'utf8'),
      readFile(path.join(directory, 'official-question-index.json'), 'utf8'),
    ]);
    const raw = JSON.parse(rawText) as JsonRecord[];
    const normalized = JSON.parse(normalizedText) as JsonRecord[];
    const indexPayload = JSON.parse(indexText) as { buildId: string; items: OfficialQuestionIndexItem[] };
    return {
      rawById: new Map(raw.map((question) => [String(question.id), question])),
      normalizedById: new Map(normalized.map((question) => [String(question.id), question])),
      index: indexPayload.items,
      indexById: new Map(indexPayload.items.map((item) => [item.questionId, item])),
      buildId: indexPayload.buildId,
    };
  })();
  return storePromise;
};

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
