import type { ErrorFlashcard, FlashcardRating } from '../types/suveca';
import { EDITORIAL_FLASHCARDS } from '../data/editorialFlashcards.generated';
import { scheduleFlashcard } from './spacedRepetition';
import { parseFlashcardContent, flashcardContentBack } from '../types/flashcardContent';
import { auth, db, isLocalAuthActive } from './firebase';

export type CardEvent = {
  id: string; cardId: string; at: string;
  sequence?: number;
  kind: 'snapshot' | 'review' | 'link' | 'archive' | 'exposure' | 'reveal' | 'edit';
  card?: ErrorFlashcard; rating?: FlashcardRating; usedHint?: boolean;
  previousReviewedAt?: string | null;
  errorId?: string; archived?: boolean; front?: string; back?: string;
};
export type StoredFlashcard = ErrorFlashcard & { archived?: boolean };
export const FLASHCARD_STORE_EVENT = 'suveca:flashcards-v3';
const scope = (uid?: string) => encodeURIComponent(uid || 'guest');
const prefix = (uid?: string) => `suveca_flashcards_v3_${scope(uid)}:`;
const eventKey = (uid: string | undefined, id: string) => `${prefix(uid)}event:${id}`;
const notify = (uid?: string) => window.dispatchEvent(new CustomEvent(FLASHCARD_STORE_EVENT, { detail: uid || 'guest' }));
const validCard = (c: any): c is ErrorFlashcard => {
  if (!c || typeof c.id !== 'string' || !['caderno', 'suveca'].includes(c.source) || typeof c.front !== 'string' || typeof c.back !== 'string') return false;
  try { if (c.content) parseFlashcardContent(c.content); return true; } catch { return false; }
};
const validEvent = (e: any): e is CardEvent => e && typeof e.id === 'string' && typeof e.cardId === 'string'
  && Number.isFinite(Date.parse(e.at)) && (
    (e.kind === 'snapshot' && validCard(e.card) && e.card.id === e.cardId)
    || (e.kind === 'review' && ['again', 'hard', 'good', 'easy'].includes(e.rating) && typeof e.usedHint === 'boolean')
    || (e.kind === 'link' && typeof e.errorId === 'string')
    || (e.kind === 'archive' && typeof e.archived === 'boolean') || e.kind === 'exposure' || e.kind === 'reveal'
    || (e.kind === 'edit' && typeof e.front === 'string' && typeof e.back === 'string'));
const keys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter(Boolean);
const parse = (raw: string) => { try { return JSON.parse(raw); } catch { return null; } };
const clean = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const canonical = (value: any): string => Array.isArray(value) ? `[${value.map(canonical).join(',')}]`
  : value && typeof value === 'object' ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}` : JSON.stringify(value);
const compareEvents = (a: CardEvent, b: CardEvent) => a.at.localeCompare(b.at)
  || (a.sequence || 0) - (b.sequence || 0) || a.id.localeCompare(b.id);

export function readCardEvents(uid?: string): CardEvent[] {
  return keys().filter(k => k.startsWith(`${prefix(uid)}event:`))
    .map(k => {
      const event = parse(localStorage.getItem(k)!);
      if (!validEvent(event)) throw new Error('Há um registro local ilegível. Ele foi preservado; a biblioteca não está totalmente carregada.');
      return event;
    })
    .sort(compareEvents);
}

/** Append-only keys: separate tabs never overwrite a whole deck or an earlier review. */
export function appendCardEvent(uid: string | undefined, event: Omit<CardEvent, 'id' | 'at'>, at = new Date().toISOString()) {
  const sequence = event.kind === 'snapshot' ? 0 : readCardEvents(uid).reduce((max, e) => Math.max(max, e.sequence || 0), 0) + 1;
  const record = clean({ ...event, at, sequence, id: crypto.randomUUID() });
  if (!validEvent(record)) throw new Error('Registro de flashcard inválido.');
  localStorage.setItem(eventKey(uid, record.id), JSON.stringify(record));
  notify(uid);
  return record;
}

/** Legacy stores are read-only. Keep an exact backup before importing each version. */
export function importLegacyCards(uid: string | undefined, source: string, raw: string) {
  const parsed = parse(raw);
  const cards = Array.isArray(parsed) ? parsed : parsed?.items;
  if (!Array.isArray(cards)) throw new Error(`Não foi possível ler uma cópia antiga (${source}). Ela foi preservada.`);
  const marker = `${prefix(uid)}import:${encodeURIComponent(source)}`;
  const previousMarker = localStorage.getItem(marker);
  if (previousMarker === raw || (previousMarker && parse(localStorage.getItem(previousMarker) || '')?.raw === raw)) return;
  const backupKey = keys().find(k => k.startsWith(`${prefix(uid)}backup:`) && parse(localStorage.getItem(k)!)?.raw === raw)
    || `${prefix(uid)}backup:${crypto.randomUUID()}`;
  if (!localStorage.getItem(backupKey)) localStorage.setItem(backupKey, JSON.stringify({ source, raw, at: new Date().toISOString() }));
  const known = new Set(readCardEvents(uid).filter(e => e.kind === 'snapshot').map(e => canonical(e.card)));
  let invalid = false;
  for (const card of cards) {
    if (!validCard(card)) { invalid = true; continue; }
    const signature = canonical(card);
    if (known.has(signature)) continue;
    appendCardEvent(uid, { kind: 'snapshot', cardId: card.id, card: clean(card) },
      Number.isFinite(Date.parse(card.lastReviewedAt || card.createdAt)) ? card.lastReviewedAt || card.createdAt : '1970-01-01T00:00:00.000Z');
    known.add(signature);
  }
  if (invalid) throw new Error('Alguns cards antigos não puderam ser interpretados. A cópia original foi preservada para recuperação.');
  localStorage.setItem(marker, backupKey);
}

export function recoverLocalCards(uid?: string) {
  const owner = uid || 'guest';
  // Exact suffix boundary and current owner only; never import guest cards into an account.
  const sources = keys().filter(k => {
    if (k === `suveca_flashcards_${owner}`) return true;
    if (!k.startsWith('suveca_flashcards_') || k.startsWith('suveca_flashcards_v3_')) return false;
    const build = parse(localStorage.getItem(k)!)?.curriculumBuildId;
    return typeof build === 'string' && k === `suveca_flashcards_${build}_${owner}`;
  });
  const failures: string[] = [];
  for (const source of sources) {
    try { importLegacyCards(uid, source, localStorage.getItem(source)!); }
    catch (error) { failures.push((error as Error).message); }
  }
  return { sources: sources.length, failures };
}

export function materializeCards(events: CardEvent[]): StoredFlashcard[] {
  const cards = new Map<string, StoredFlashcard>();
  const baselines = new Map<string, CardEvent>();
  const editorial = new Map<string, ErrorFlashcard>(EDITORIAL_FLASHCARDS.map(c => [c.id, { ...c, sourceRefs: [...c.sourceRefs], source: 'suveca' }]));
  for (const e of events.filter(e => e.kind === 'snapshot')) {
    const previous = baselines.get(e.cardId);
    const score = (v: CardEvent) => `${v.card?.lastReviewedAt || v.card?.createdAt || ''}|${String((v.card?.correctCount || 0) + (v.card?.incorrectCount || 0)).padStart(10, '0')}`;
    if (!previous || score(e) > score(previous) || (score(e) === score(previous) && e.id > previous.id)) baselines.set(e.cardId, e);
  }
  for (const [id, e] of baselines) cards.set(id, { ...e.card!, topic: e.card!.topic || 'Meu Caderno', correctCount: e.card!.correctCount || 0, incorrectCount: e.card!.incorrectCount || 0 });
  for (const [id, published] of editorial) {
    // Publication controls text; the learner owns scheduling and review records.
    const saved = cards.get(id);
    cards.set(id, { ...saved, ...published, correctCount: saved?.correctCount || 0, incorrectCount: saved?.incorrectCount || 0 });
  }
  for (const e of [...events].sort(compareEvents)) {
    const card = cards.get(e.cardId);
    if (!card) continue;
    if (e.kind === 'review' && e.at > (baselines.get(e.cardId)?.card?.lastReviewedAt || '')
      && (e.previousReviewedAt === undefined || e.previousReviewedAt === (card.lastReviewedAt || null))) {
      cards.set(e.cardId, scheduleFlashcard(card, e.rating!, !!e.usedHint, new Date(e.at)));
    } else if (e.kind === 'link') card.errorId = e.errorId;
    else if (e.kind === 'archive') card.archived = e.archived;
    else if (e.kind === 'edit' && card.source === 'caderno') {
      card.front = e.front!; card.back = e.back!;
      // A free-text edit is explicit legacy content, never stale structured data.
      delete card.content;
      delete card.hint;
      delete card.explanation;
      delete card.sourceRefs;
    }
  }
  return [...cards.values()].map(card => {
    const projected = card.content ? { ...card, front: card.content.front, back: flashcardContentBack(card.content), hint: card.content.hint || undefined, explanation: card.content.deepDive || undefined, sourceRefs: card.content.sourceRefs } : card;
    return projected.editorialStatus === 'retired' ? { ...projected, archived: true } : projected;
  });
}
export const readStoredFlashcards = (uid?: string) => materializeCards(readCardEvents(uid));

export function recordCardReview(uid: string | undefined, cardId: string, rating: FlashcardRating, usedHint: boolean, currentRevealId?: string) {
  const events = readCardEvents(uid);
  const card = materializeCards(events).find(c => c.id === cardId);
  const now = new Date();
  if (!card || card.archived || (card.nextReviewAt && Date.parse(card.nextReviewAt) > now.getTime())) {
    throw new Error('Este card já foi avaliado ou não está devido. A biblioteca foi atualizada.');
  }
  // Seeing assistance remains recorded even if the UI is closed/reopened or the hint is hidden.
  const exposed = events.some(e => e.cardId === cardId && (e.kind === 'exposure' || (e.kind === 'reveal' && e.id !== currentRevealId)) && e.at > (card.lastReviewedAt || ''));
  appendCardEvent(uid, { kind: 'review', cardId, rating, usedHint: usedHint || exposed, previousReviewedAt: card.lastReviewedAt || null }, now.toISOString());
  return readStoredFlashcards(uid);
}

export interface FlashcardCloud {
  read: () => Promise<Array<{ id: string; data: any }>>;
  write: (events: CardEvent[]) => Promise<void>;
}
export const canSyncFlashcards = (uid?: string) => !!uid && uid !== 'guest' && !isLocalAuthActive() && auth.currentUser?.uid === uid;
function cloudFor(uid: string): FlashcardCloud {
  return {
    async read() {
      const { collection, query, where, documentId, getDocsFromServer } = await import('firebase/firestore');
      const result = await getDocsFromServer(query(collection(db, 'users', uid, 'data'),
        where(documentId(), '>=', 'flashcards_'), where(documentId(), '<=', 'flashcards_\uf8ff')));
      return result.docs.map(d => ({ id: d.id, data: d.data() }));
    },
    async write(events) {
      const { doc, writeBatch } = await import('firebase/firestore');
      for (let i = 0; i < events.length; i += 400) {
        if (!canSyncFlashcards(uid)) throw new Error('A conta foi alterada.');
        const batch = writeBatch(db);
        for (const event of events.slice(i, i + 400)) batch.set(doc(db, 'users', uid, 'data', `flashcards_v3_${event.id}`), clean(event));
        await batch.commit();
      }
    },
  };
}
const queues = new Map<string, Promise<unknown>>();
async function withSyncDeadline<T>(operation: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('A sincronização demorou demais. Os registros locais permanecem disponíveis; tente novamente.')), 20_000);
    })]);
  } finally { clearTimeout(timer!); }
}
/** Immutable remote operations make retries idempotent and preserve concurrent writers. */
export function syncFlashcards(uid: string, cloud = cloudFor(uid), stillOwner = () => canSyncFlashcards(uid)): Promise<void> {
  const run = async () => {
    if (!stillOwner()) throw new Error('A conta foi alterada.');
    const remote = await withSyncDeadline(cloud.read());
    if (!stillOwner()) throw new Error('A conta foi alterada.');
    for (const row of remote) {
      if (row.id.startsWith('flashcards_v3_')) {
        if (!validEvent(row.data) || row.id !== `flashcards_v3_${row.data.id}`) throw new Error('Registro remoto inválido. Os dados locais foram preservados.');
        const existing = localStorage.getItem(eventKey(uid, row.data.id));
        if (existing && JSON.stringify(clean(parse(existing))) !== JSON.stringify(clean(row.data))) {
          // Firestore can reorder object fields; compare their canonical representation.
          if (canonical(parse(existing)) !== canonical(row.data)) throw new Error('Conflito em um registro remoto. A cópia local foi preservada.');
        }
        localStorage.setItem(eventKey(uid, row.data.id), JSON.stringify(row.data));
        localStorage.setItem(`${prefix(uid)}ack:${row.data.id}`, '1');
      } else if (row.id === 'flashcards_caderno' || row.id.startsWith('flashcards_caderno_')) {
        importLegacyCards(uid, `cloud:${row.id}`, JSON.stringify(row.data));
      }
    }
    const pending = readCardEvents(uid).filter(e => !localStorage.getItem(`${prefix(uid)}ack:${e.id}`));
    if (pending.length) await withSyncDeadline(cloud.write(pending));
    if (!stillOwner()) throw new Error('A conta foi alterada.');
    for (const e of pending) localStorage.setItem(`${prefix(uid)}ack:${e.id}`, '1');
    notify(uid);
  };
  const pending = (queues.get(uid) || Promise.resolve()).catch(() => {}).then(run);
  queues.set(uid, pending);
  return pending;
}
export const hasPendingFlashcards = (uid?: string) => readCardEvents(uid).some(e => !localStorage.getItem(`${prefix(uid)}ack:${e.id}`));
