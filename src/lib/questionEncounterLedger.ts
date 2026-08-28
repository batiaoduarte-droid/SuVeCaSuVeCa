export type QuestionEncounterPurpose =
  | 'example'
  | 'acquisition_practice'
  | 'diagnostic'
  | 'transfer'
  | 'review';

export interface QuestionEncounter {
  questionId: string;
  purpose: QuestionEncounterPurpose;
  encounteredAt: string;
  correct?: boolean;
  confidence?: number;
  assistanceLevel?: string;
  sessionId?: string;
}

interface QuestionEncounterLedgerV1 {
  schemaVersion: 1;
  encounters: QuestionEncounter[];
}

const STORAGE_PREFIX = 'suveca_question_encounters_v1_';
const MAX_ENCOUNTERS = 500;
const MAX_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
export const RECENT_TRANSFER_EXPOSURE_MS = 14 * 24 * 60 * 60 * 1000;

const storageKey = (userId?: string | null) => `${STORAGE_PREFIX}${userId || 'guest'}`;

const isPurpose = (value: unknown): value is QuestionEncounterPurpose =>
  value === 'example'
  || value === 'acquisition_practice'
  || value === 'diagnostic'
  || value === 'transfer'
  || value === 'review';

const normalizeEncounter = (value: unknown): QuestionEncounter | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<QuestionEncounter>;
  const questionId = String(candidate.questionId || '').trim();
  const encounteredAt = String(candidate.encounteredAt || '');
  if (!questionId || !isPurpose(candidate.purpose) || !Number.isFinite(Date.parse(encounteredAt))) {
    return null;
  }
  return {
    questionId,
    purpose: candidate.purpose,
    encounteredAt,
    ...(typeof candidate.correct === 'boolean' ? { correct: candidate.correct } : {}),
    ...(typeof candidate.confidence === 'number' && Number.isFinite(candidate.confidence)
      ? { confidence: Math.max(0, Math.min(1, candidate.confidence)) }
      : {}),
    ...(candidate.assistanceLevel ? { assistanceLevel: String(candidate.assistanceLevel) } : {}),
    ...(candidate.sessionId ? { sessionId: String(candidate.sessionId) } : {}),
  };
};

export const readQuestionEncounters = (userId?: string | null): QuestionEncounter[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<QuestionEncounterLedgerV1> | QuestionEncounter[];
    const values = Array.isArray(parsed) ? parsed : parsed.encounters;
    if (!Array.isArray(values)) return [];
    return values
      .map(normalizeEncounter)
      .filter((item): item is QuestionEncounter => Boolean(item))
      .sort((left, right) => Date.parse(left.encounteredAt) - Date.parse(right.encounteredAt));
  } catch {
    return [];
  }
};

const writeQuestionEncounters = (userId: string | null | undefined, encounters: QuestionEncounter[]) => {
  if (typeof localStorage === 'undefined') return;
  const payload: QuestionEncounterLedgerV1 = { schemaVersion: 1, encounters };
  localStorage.setItem(storageKey(userId), JSON.stringify(payload));
};

/**
 * Mantém somente o encontro mais recente para a mesma questão, finalidade e
 * sessão. Isso evita duplicar sessões PBL inteiras no ledger de exposição.
 */
export const recordQuestionEncounter = (
  userId: string | null | undefined,
  encounter: QuestionEncounter,
): void => {
  const normalized = normalizeEncounter(encounter);
  if (!normalized || typeof localStorage === 'undefined') return;
  const now = Date.now();
  const identity = `${normalized.questionId}\u001f${normalized.purpose}\u001f${normalized.sessionId || ''}`;
  const retained = readQuestionEncounters(userId).filter((item) => {
    const itemIdentity = `${item.questionId}\u001f${item.purpose}\u001f${item.sessionId || ''}`;
    return itemIdentity !== identity && now - Date.parse(item.encounteredAt) <= MAX_RETENTION_MS;
  });
  const next = [...retained, normalized]
    .sort((left, right) => Date.parse(left.encounteredAt) - Date.parse(right.encounteredAt))
    .slice(-MAX_ENCOUNTERS);
  writeQuestionEncounters(userId, next);
};

export const getRecentQuestionEncounterRefs = (
  userId: string | null | undefined,
  options: {
    now?: number;
    withinMs?: number;
    excludeSessionId?: string;
    purposes?: QuestionEncounterPurpose[];
  } = {},
): string[] => {
  const now = options.now ?? Date.now();
  const withinMs = options.withinMs ?? RECENT_TRANSFER_EXPOSURE_MS;
  const purposes = options.purposes ? new Set(options.purposes) : null;
  return [...new Set(readQuestionEncounters(userId)
    .filter((item) => now - Date.parse(item.encounteredAt) <= withinMs)
    .filter((item) => !options.excludeSessionId || item.sessionId !== options.excludeSessionId)
    .filter((item) => !purposes || purposes.has(item.purpose))
    .map((item) => item.questionId))];
};
