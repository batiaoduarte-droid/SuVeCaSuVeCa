import type { QuizQuestion } from '../types/suveca';
import { formatOfficialContent } from './officialContent';

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

export interface OfficialQuestionDetail {
  questionId: string;
  provenance: {
    kind: 'official_question';
    officialPayloadPolicy: 'immutable';
    buildId: string;
    officialHashSha256: string;
  };
  official: {
    raw: Record<string, unknown>;
    normalized: Record<string, unknown>;
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
  year?: string | number;
  difficulty?: string;
  query?: string;
}

const queryString = (filters: OfficialQuestionFilters & { offset?: number; limit?: number }) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  return params.toString();
};

export async function fetchOfficialQuestions(
  filters: OfficialQuestionFilters,
  options: { offset?: number; limit?: number } = {},
) {
  const response = await fetch(`/api/knowledge/questions?${queryString({ ...filters, ...options })}`);
  if (!response.ok) throw new Error('Falha ao consultar as questões oficiais.');
  return response.json() as Promise<{
    buildId: string;
    total: number;
    offset: number;
    limit: number;
    items: OfficialQuestionIndexItem[];
  }>;
}

export async function fetchOfficialQuestion(questionId: string) {
  const response = await fetch(`/api/knowledge/questions/${encodeURIComponent(questionId)}`);
  if (!response.ok) throw new Error('Falha ao carregar a questão oficial.');
  return response.json() as Promise<OfficialQuestionDetail>;
}

export async function fetchOfficialQuestionSample(filters: OfficialQuestionFilters, count = 10) {
  const response = await fetch('/api/knowledge/questions/sample', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...filters, count }),
  });
  if (!response.ok) throw new Error('Falha ao montar a amostra de questões oficiais.');
  return response.json() as Promise<{ count: number; questions: OfficialQuestionDetail[] }>;
}

export function officialDetailToQuizQuestion(detail: OfficialQuestionDetail): QuizQuestion {
  const raw = detail.official.raw as {
    statement?: string;
    statement_text?: string;
    alternatives?: Array<{ id?: string; sanitized_body?: string; body?: string; position?: string }>;
    topics?: Array<{ name?: string }>;
    solution?: { sanitized_complete?: string; complete?: string; complete_html?: string };
  };
  const normalized = detail.official.normalized as { correct_answer?: string };
  return {
    id: detail.questionId,
    type: 'MULTIPLA_ESCOLHA',
    bank: 'Questão oficial',
    topic: raw.topics?.[0]?.name || 'Língua Portuguesa',
    questionText: formatOfficialContent(raw.statement || raw.statement_text),
    options: (raw.alternatives || []).map((alternative, index) => ({
      letter: String.fromCharCode(65 + Number(alternative.position ?? index)),
      text: formatOfficialContent(alternative.body || alternative.sanitized_body),
    })),
    correctAnswer: String(normalized.correct_answer || ''),
    commentary: formatOfficialContent(
      raw.solution?.complete_html
      || raw.solution?.complete
      || raw.solution?.sanitized_complete
      || 'Solução textual não disponível no corpus.'
    ),
    origin: 'official',
    officialQuestionId: detail.questionId,
    moduleId: detail.suvecaDerived.moduleIds[0],
    conceptIds: detail.suvecaDerived.conceptIds,
    sourceRefs: [`QUESTION:${detail.questionId}`],
  };
}
