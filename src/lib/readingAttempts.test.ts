import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ auth: { currentUser: { uid: 'one' } as { uid: string } | null }, get: vi.fn(), set: vi.fn() }));
vi.mock('./firebase', () => ({ auth: state.auth, db: {}, isLocalAuthActive: () => false }));
vi.mock('firebase/firestore', () => ({ doc: (...args: unknown[]) => args.slice(1).join('/'), runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => callback({ get: state.get, set: state.set }) }));
import { readReadingAttempts, restoreReadingAttempts, saveReadingAttempt, type ReadingAttempt } from './readingAttempts';
const attempt: ReadingAttempt = { id: 'a', questionId: 'Q1', lessonId: 'A00', answer: 'A', correct: false, confidence: 'low', justification: 'Critério usado.', createdAt: '2026-09-26T12:00:00Z' };
describe('Tentativas da apostila', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); state.auth.currentUser = { uid: 'one' }; });
  it('preserva a tentativa local quando a sincronização falha', async () => {
    state.get.mockRejectedValueOnce(new Error('offline'));
    const saved = vi.fn();
    expect(await saveReadingAttempt('one', attempt, saved)).toBe(false);
    expect(saved).toHaveBeenCalledOnce();
    expect(readReadingAttempts('one')).toEqual([attempt]);
    expect(readReadingAttempts('two')).toEqual([]);
  });
  it('mescla históricos e reenvia escrita pendente sem duplicar IDs', async () => {
    localStorage.setItem('suveca_reading_attempts_v1_one', JSON.stringify([attempt]));
    const cloud = { ...attempt, id: 'b', questionId: 'Q2' };
    state.get.mockResolvedValue({ data: () => ({ attempts: [cloud] }) });
    await restoreReadingAttempts('one');
    expect(readReadingAttempts('one')).toEqual([cloud, attempt]);
    expect(state.set).toHaveBeenCalledWith('users/one/data/reading_attempts', { schemaVersion: 1, attempts: [cloud, attempt] });
  });
  it('descarta resposta remota de uma conta encerrada', async () => {
    state.get.mockImplementationOnce(async () => { state.auth.currentUser = { uid: 'two' }; return { data: () => ({ attempts: [attempt] }) }; });
    await expect(restoreReadingAttempts('one')).rejects.toThrow('conta');
    expect(readReadingAttempts('two')).toEqual([]);
    expect(state.set).not.toHaveBeenCalled();
  });
});
