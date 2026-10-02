import { beforeEach, describe, expect, it, vi } from 'vitest';
import { appendCardEvent, hasPendingFlashcards, importLegacyCards, materializeCards, readCardEvents, readStoredFlashcards, recordCardReview, recoverLocalCards, syncFlashcards, type CardEvent, type FlashcardCloud } from './flashcardStore';
import type { ErrorFlashcard } from '../types/suveca';
import { EDITORIAL_FLASHCARDS } from '../data/editorialFlashcards.generated';
vi.mock('./firebase', () => ({ auth: { currentUser: null }, db: {}, isLocalAuthActive: () => false }));
const card: ErrorFlashcard = { id: 'personal-1', source: 'caderno', errorId: 'error-1', topic: 'Tema', front: 'Pergunta?', back: 'Resposta.', createdAt: '2026-08-01T00:00:00.000Z', correctCount: 0, incorrectCount: 0 };
const personal = (uid?: string) => readStoredFlashcards(uid).filter(c => c.source === 'caderno');
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('flashcard persistence and recovery', () => {
  it('preserves structured content across reloads and projects the same answer for text/audio', () => {
    const content = { schemaVersion: '2.1.0' as const, family: 'rule' as const, front: 'Pergunta tipada?', hint: null, deepDive: null, difficulty: 'facil' as const, topic: 'Tema', tags: ['tema'], sourceRefs: ['EDITORIAL:TEST'], back: { directAnswer: 'Definição tipada.', normativeRule: 'Definição tipada.', canonicalExample: null, contraExample: null, quickTest: null, conditions: null } };
    appendCardEvent('alice', { kind: 'snapshot', cardId: card.id, card: { ...card, content } });
    expect(personal('alice')[0]).toMatchObject({ content, front: content.front, back: 'Resposta direta: Definição tipada.' });
    recordCardReview('alice', card.id, 'good', false);
    expect(personal('alice')[0]).toMatchObject({ content, correctCount: 1 });
    appendCardEvent('alice', { kind: 'edit', cardId: card.id, front: 'Pergunta editada?', back: 'Resposta livre.' });
    expect(personal('alice')[0].content).toBeUndefined();
    expect(personal('alice')[0]).toMatchObject({ front: 'Pergunta editada?', back: 'Resposta livre.', correctCount: 1 });
  });

  it('rejects invalid structured snapshots instead of silently losing their content', () => {
    expect(() => appendCardEvent('alice', { kind: 'snapshot', cardId: card.id, card: { ...card, content: { schemaVersion: '2.1.0', family: 'procedure', front: 'Pergunta?', hint: null, deepDive: null, difficulty: 'medio', topic: 'Tema', tags: ['tema'], sourceRefs: ['EDITORIAL:TEST'], back: { directAnswer: 'Resposta.', normativeRule: null, canonicalExample: null, contraExample: null, quickTest: null, steps: [] } } } })).toThrow();
    expect(personal('alice')).toHaveLength(0);
  });
  it('preserves 2.1 and 2.2 snapshots, their immutable events and review intervals through hydration', async () => {
    const shared = { family: 'procedure' as const, front: 'Como conferir a troca do conectivo?', hint: null, deepDive: null, difficulty: 'medio' as const, topic: 'Reescrita', tags: ['reescrita'], sourceRefs: ['EDITORIAL:TEST'] };
    const back = { directAnswer: 'Confira o sentido e a forma verbal.', normativeRule: null, canonicalExample: null, quickTest: null, steps: ['Confira o sentido.'] };
    const old = { ...card, id: 'old-typed', content: { ...shared, schemaVersion: '2.1.0' as const, back: { ...back, contraExample: 'Chorou, uma vez que caiu.' } } };
    const modern = { ...card, id: 'new-typed', content: { ...shared, schemaVersion: '2.2.0' as const, back: { ...back, contraExample: { role: 'invalid_transform' as const, text: 'Chorou, uma vez que caiu.', operation: 'Substituir uma vez que por contanto que.', explanation: 'A frase original é causal; a substituição altera seu sentido.' } } } };
    appendCardEvent('alice', { kind: 'snapshot', cardId: old.id, card: old });
    appendCardEvent('alice', { kind: 'snapshot', cardId: modern.id, card: modern });
    recordCardReview('alice', modern.id, 'good', false);
    const before = readCardEvents('alice'), raw = JSON.stringify(before);
    const interval = personal('alice').find(c => c.id === modern.id)!.nextReviewAt;
    const cloud: FlashcardCloud = { read: async () => before.map(e => ({ id: `flashcards_v3_${e.id}`, data: e })), write: vi.fn(async () => {}) };
    await syncFlashcards('alice', cloud, () => true);
    expect(JSON.stringify(readCardEvents('alice'))).toBe(raw);
    expect(personal('alice').find(c => c.id === modern.id)).toMatchObject({ nextReviewAt: interval, content: modern.content });
    expect(personal('alice').find(c => c.id === old.id)).toMatchObject({ content: old.content });
    expect(personal('alice').find(c => c.id === modern.id)!.back).toContain('Operação inválida: Substituir');
  });
  it('applies the published content by stable ID while retaining an older editorial review history', () => {
    const published = EDITORIAL_FLASHCARDS.find(c => c.id === 'editorial-flash-ip-a02-g01-006')!;
    const oldSnapshot = { ...published, content: undefined, front: 'Pergunta da edição anterior', back: 'Verso da edição anterior',
      correctCount: 3, incorrectCount: 1, lastReviewedAt: '2026-08-01T00:00:00.000Z', nextReviewAt: '2026-11-01T00:00:00.000Z', intervalDays: 20 };
    const event = appendCardEvent('alice', { kind: 'snapshot', cardId: published.id, card: oldSnapshot });
    const result = readStoredFlashcards('alice').find(c => c.id === published.id)!;
    expect(result).toMatchObject({ id: published.id, front: published.front, content: published.content, correctCount: 3, incorrectCount: 1,
      nextReviewAt: oldSnapshot.nextReviewAt, lastReviewedAt: oldSnapshot.lastReviewedAt, intervalDays: 20 });
    expect(readCardEvents('alice')).toEqual([event]);
    expect(event.card!.back).toBe('Verso da edição anterior');
  });
  it('recovers every owned legacy build without mutating its bytes or importing another account', () => {
    const raw = JSON.stringify([card]);
    localStorage.setItem('suveca_flashcards_alice', raw);
    localStorage.setItem('suveca_flashcards_old_alice', JSON.stringify({ curriculumBuildId: 'old', items: [{ ...card, id: 'old' }] }));
    localStorage.setItem('suveca_flashcards_other_alice', JSON.stringify([ { ...card, id: 'wrong-account' } ]));
    localStorage.setItem('suveca_flashcards_guest', JSON.stringify([{ ...card, id: 'guest' }]));
    expect(recoverLocalCards('alice')).toEqual({ sources: 2, failures: [] });
    expect(personal('alice').map(c => c.id).sort()).toEqual(['old', 'personal-1']);
    const count = readCardEvents('alice').length;
    recoverLocalCards('alice');
    expect(readCardEvents('alice')).toHaveLength(count);
    expect(localStorage.getItem('suveca_flashcards_alice')).toBe(raw);
  });
  it('merges a stale cloud deck without deleting a newly generated local card', async () => {
    appendCardEvent('alice', { kind: 'snapshot', cardId: card.id, card });
    const cloud: FlashcardCloud = { read: async () => [{ id: 'flashcards_caderno_old', data: { items: [{ ...card, id: 'remote' }] } }], write: vi.fn(async () => {}) };
    await syncFlashcards('alice', cloud, () => true);
    expect(personal('alice')).toHaveLength(2);
    expect(hasPendingFlashcards('alice')).toBe(false);
    await syncFlashcards('alice', cloud, () => true);
    expect(personal('alice')).toHaveLength(2);
    expect(cloud.write).toHaveBeenCalledTimes(1);
  });
  it('keeps changes made while hydration is in flight', async () => {
    let resolve!: (value: []) => void;
    const cloud: FlashcardCloud = { read: () => new Promise(r => { resolve = r; }), write: vi.fn(async () => {}) };
    const promise = syncFlashcards('alice', cloud, () => true);
    await Promise.resolve(); await Promise.resolve();
    appendCardEvent('alice', { kind: 'snapshot', cardId: card.id, card });
    resolve([]); await promise;
    expect(personal('alice')).toHaveLength(1);
    expect(cloud.write).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ cardId: card.id })]));
  });
  it('preserves pending operations after failed writes, then retries idempotently', async () => {
    const event = appendCardEvent('alice', { kind: 'snapshot', cardId: card.id, card });
    const cloud: FlashcardCloud = { read: async () => [], write: vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined) };
    await expect(syncFlashcards('alice', cloud, () => true)).rejects.toThrow('offline');
    expect(personal('alice')).toHaveLength(1); expect(hasPendingFlashcards('alice')).toBe(true);
    await syncFlashcards('alice', cloud, () => true);
    expect(cloud.write).toHaveBeenLastCalledWith([event]);
    expect(hasPendingFlashcards('alice')).toBe(false);
  });
  it('does not apply or upload after the authenticated owner changes', async () => {
    let active = true;
    const cloud: FlashcardCloud = { read: async () => { active = false; return [{ id: 'flashcards_caderno', data: { items: [card] } }]; }, write: vi.fn() };
    await expect(syncFlashcards('alice', cloud, () => active)).rejects.toThrow();
    expect(personal('alice')).toHaveLength(0); expect(cloud.write).not.toHaveBeenCalled();
  });
  it('preserves review progress against older snapshots and rejects repeat grading', () => {
    importLegacyCards(undefined, 'legacy', JSON.stringify([card]));
    recordCardReview(undefined, card.id, 'good', false);
    importLegacyCards(undefined, 'older-cloud', JSON.stringify([card]));
    expect(personal()[0].correctCount).toBe(1);
    expect(personal()[0].nextReviewAt).toBeTruthy();
    expect(() => recordCardReview(undefined, card.id, 'good', false)).toThrow();
  });
  it('keeps hint assistance across reopening and ignores only this attempt’s reveal', () => {
    appendCardEvent(undefined, { kind: 'snapshot', cardId: card.id, card });
    appendCardEvent(undefined, { kind: 'exposure', cardId: card.id });
    const reveal = appendCardEvent(undefined, { kind: 'reveal', cardId: card.id });
    recordCardReview(undefined, card.id, 'easy', false, reveal.id);
    expect(personal()[0].lastRating).toBe('good');
    expect(personal()[0].lastReviewUsedHint).toBe(true);
  });
  it('treats a previous answer consultation as assistance, without itself rescheduling', () => {
    appendCardEvent(undefined, { kind: 'snapshot', cardId: card.id, card });
    appendCardEvent(undefined, { kind: 'reveal', cardId: card.id });
    expect(personal()[0].nextReviewAt).toBeUndefined();
    recordCardReview(undefined, card.id, 'good', false);
    expect(personal()[0].lastRating).toBe('hard');
  });
  it('combines concurrent operations deterministically without double scheduling one attempt', () => {
    const snapshot = appendCardEvent(undefined, { kind: 'snapshot', cardId: card.id, card });
    const a: CardEvent = { id: 'a', kind: 'review', at: '2026-09-29T10:00:00.000Z', cardId: card.id, rating: 'good', usedHint: false, previousReviewedAt: null };
    const b: CardEvent = { ...a, id: 'b', rating: 'easy' };
    expect(materializeCards([snapshot, b, a])).toEqual(materializeCards([a, snapshot, b]));
    expect(materializeCards([snapshot, a, b]).find(c => c.id === card.id)?.correctCount).toBe(1);
  });
  it('archives and relinks without losing identity, text, or review history', () => {
    appendCardEvent(undefined, { kind: 'snapshot', cardId: card.id, card });
    recordCardReview(undefined, card.id, 'good', false);
    appendCardEvent(undefined, { kind: 'archive', cardId: card.id, archived: true });
    appendCardEvent(undefined, { kind: 'link', cardId: card.id, errorId: 'recovered-origin' });
    appendCardEvent(undefined, { kind: 'edit', cardId: card.id, front: 'Pergunta editada?', back: card.back });
    expect(personal()[0]).toMatchObject({ id: card.id, errorId: 'recovered-origin', archived: true, correctCount: 1, front: 'Pergunta editada?' });
    appendCardEvent(undefined, { kind: 'archive', cardId: card.id, archived: false });
    expect(personal()[0].archived).toBe(false);
    expect(readCardEvents().filter(e => e.kind === 'review')).toHaveLength(1);
  });
  it('reports invalid legacy data and preserves the original backup', () => {
    const raw = JSON.stringify({ items: [card, { id: 'broken' }] });
    expect(() => importLegacyCards('alice', 'invalid', raw)).toThrow();
    expect(personal('alice')).toHaveLength(1);
    expect(Object.keys(localStorage).some(k => k.includes(':backup:') && JSON.parse(localStorage.getItem(k)!).raw === raw)).toBe(true);
  });
  it('does not report success or mutate the deck when local storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(() => appendCardEvent(undefined, { kind: 'snapshot', cardId: card.id, card })).toThrow('Full');
    expect(personal()).toHaveLength(0);
  });
  it('accepts reordered Firestore fields but refuses conflicting immutable events', async () => {
    const event = appendCardEvent('alice', { kind: 'snapshot', cardId: card.id, card });
    const reordered = Object.fromEntries(Object.entries(event).reverse());
    const cloud: FlashcardCloud = { read: async () => [{ id: `flashcards_v3_${event.id}`, data: reordered }], write: vi.fn() };
    await syncFlashcards('alice', cloud, () => true);
    cloud.read = async () => [{ id: `flashcards_v3_${event.id}`, data: { ...event, card: { ...card, back: 'Conflict' } } }];
    await expect(syncFlashcards('alice', cloud, () => true)).rejects.toThrow('Conflito');
    expect(personal('alice')[0].back).toBe(card.back);
  });
});
