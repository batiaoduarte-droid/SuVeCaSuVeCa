import { afterEach, describe, expect, it, vi } from 'vitest';
import { PBLSessionRepository } from '../persistence/PBLSessionRepository';
import type { PBLSession } from '../../../types/pbl';

describe('session confirmation before a tutor request', () => {
  afterEach(() => vi.restoreAllMocks());
  const session = { sessionId: 'sync-test', userId: 'local-user-personal' } as PBLSession;
  it('requires successful server synchronization', async () => {
    const save = vi.spyOn(PBLSessionRepository, 'saveSession').mockResolvedValue({ syncedRemotely: false });
    await expect(PBLSessionRepository.prepareTutorSession(session)).rejects.toThrow('Não foi possível confirmar');
    save.mockResolvedValue({ syncedRemotely: true });
    await expect(PBLSessionRepository.prepareTutorSession(session)).resolves.toBeUndefined();
  });
  it('never synchronizes a guest session as another account', async () => {
    const save = vi.spyOn(PBLSessionRepository, 'saveSession');
    await expect(PBLSessionRepository.prepareTutorSession({ ...session, userId: 'guest' })).rejects.toThrow('Entre na sua conta');
    expect(save).not.toHaveBeenCalled();
  });
});
