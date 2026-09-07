import type { PBLSession } from '../../../types/pbl';

export interface SaveSessionResult {
  saved: boolean;
  reason?: 'stale_snapshot' | 'attempt_history_truncated' | 'attempt_immutable_violation' | 'unauthenticated' | 'invalid_session';
}

export class PBLServerSessionRepository {
  // O cache em memória utiliza chave composta "userId::sessionId" para garantir isolamento estrito entre usuários
  private inMemoryStore = new Map<string, PBLSession>();

  // Fila sequencial assíncrona por sessão para garantir ordenação estrita in-process
  private sessionWriteQueues = new Map<string, Promise<SaveSessionResult>>();

  private buildKey(userId: string, sessionId: string): string {
    return `${userId}::${sessionId}`;
  }

  private async getFirestoreInstance() {
    if (typeof process === 'undefined' || !process.versions?.node) return null;
    try {
      const { getApps } = await import('firebase-admin/app');
      const { getFirestore } = await import('firebase-admin/firestore');
      const apps = getApps();
      if (apps.length > 0) {
        return getFirestore(apps[0]);
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Salva a sessão no servidor vinculada estritamente ao usuário autenticado.
   * Rejeita chamadas sem identidade autenticada ou para usuário 'guest'.
   * Executa a conferência de versão e ordenação atomicamente no Firestore (via transação)
   * e serializa chamadas in-process via fila assíncrona por sessão.
   */
  public async saveSession(session: PBLSession, authenticatedUserId?: string): Promise<SaveSessionResult> {
    if (!session || !session.sessionId) {
      return { saved: false, reason: 'invalid_session' };
    }
    if (!authenticatedUserId || authenticatedUserId === 'guest') {
      return { saved: false, reason: 'unauthenticated' };
    }

    const key = this.buildKey(authenticatedUserId, session.sessionId);
    const previousTask = this.sessionWriteQueues.get(key) || Promise.resolve({ saved: true } as SaveSessionResult);

    const currentTask = previousTask.catch(() => ({ saved: false } as SaveSessionResult)).then(async (): Promise<SaveSessionResult> => {
      const firestore = await this.getFirestoreInstance();
      const enrichedSession: PBLSession = {
        ...session,
        userId: authenticatedUserId,
      };

      if (firestore) {
        // Transação atômica no Firestore: compara com o estado real persistido no documento
        const sessionDocRef = firestore
          .collection('users')
          .doc(authenticatedUserId)
          .collection('pblSessions')
          .doc(session.sessionId);

        const txResult = await firestore.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(sessionDocRef);
          if (snapshot.exists) {
            const existingData = snapshot.data() as PBLSession;

            // 1. Monotonicidade temporal contra o documento persistido
            if (existingData?.updatedAt && session.updatedAt) {
              const existingTime = new Date(existingData.updatedAt).getTime();
              const incomingTime = new Date(session.updatedAt).getTime();
              if (!isNaN(existingTime) && !isNaN(incomingTime) && incomingTime < existingTime) {
                return { saved: false, reason: 'stale_snapshot' as const };
              }
            }

            // 2. Validação atômica de histórico de tentativas contra o Firestore
            if (existingData?.attempts && Array.isArray(existingData.attempts) && existingData.attempts.length > 0) {
              const existingAttempts = existingData.attempts;
              const incomingAttempts = session.attempts || [];

              if (incomingAttempts.length < existingAttempts.length) {
                const err = new Error('Tentativa violada: histórico de tentativas é estritamente append-only e não pode ser truncado.');
                (err as any).code = 'attempt_history_truncated';
                throw err;
              }

              for (let i = 0; i < existingAttempts.length; i++) {
                const prev = existingAttempts[i];
                const next = incomingAttempts[i];
                if (!next || next.attemptId !== prev.attemptId || next.questionRef !== prev.questionRef || next.userAnswer !== prev.userAnswer) {
                  const err = new Error('Tentativa violada: tentativas anteriores já registradas são estritamente imutáveis.');
                  (err as any).code = 'attempt_immutable_violation';
                  throw err;
                }
              }
            }
          }

          transaction.set(sessionDocRef, enrichedSession, { merge: true });
          return { saved: true as const };
        });

        if (txResult.saved === false) {
          return txResult;
        }
      } else {
        // Fallback em memória (para ambientes de teste ou sem Firebase Admin ativo)
        const existing = this.inMemoryStore.get(key);
        if (existing?.updatedAt && session.updatedAt) {
          const existingTime = new Date(existing.updatedAt).getTime();
          const incomingTime = new Date(session.updatedAt).getTime();
          if (!isNaN(existingTime) && !isNaN(incomingTime) && incomingTime < existingTime) {
            return { saved: false, reason: 'stale_snapshot' };
          }
        }

        if (existing?.attempts && Array.isArray(existing.attempts) && existing.attempts.length > 0) {
          const existingAttempts = existing.attempts;
          const incomingAttempts = session.attempts || [];
          if (incomingAttempts.length < existingAttempts.length) {
            const err = new Error('Tentativa violada: histórico de tentativas é estritamente append-only e não pode ser truncado.');
            (err as any).code = 'attempt_history_truncated';
            throw err;
          }
          for (let i = 0; i < existingAttempts.length; i++) {
            const prev = existingAttempts[i];
            const next = incomingAttempts[i];
            if (!next || next.attemptId !== prev.attemptId || next.questionRef !== prev.questionRef || next.userAnswer !== prev.userAnswer) {
              const err = new Error('Tentativa violada: tentativas anteriores já registradas são estritamente imutáveis.');
              (err as any).code = 'attempt_immutable_violation';
              throw err;
            }
          }
        }
      }

      this.inMemoryStore.set(key, enrichedSession);
      return { saved: true };
    });

    this.sessionWriteQueues.set(key, currentTask);
    return await currentTask;
  }

  /**
   * Recupera a sessão exclusivamente para o usuário autenticado dono da sessão.
   * Se o usuário não for fornecido, for 'guest' ou não coincidir, retorna null imediatamente (fail-closed).
   */
  public async getSession(sessionId: string, authenticatedUserId?: string): Promise<PBLSession | null> {
    if (!sessionId || !authenticatedUserId || authenticatedUserId === 'guest') {
      return null;
    }

    const key = this.buildKey(authenticatedUserId, sessionId);
    const pendingWrite = this.sessionWriteQueues.get(key);
    if (pendingWrite) {
      await pendingWrite.catch(() => {});
    }

    let session = this.inMemoryStore.get(key) || null;

    if (!session) {
      try {
        const firestore = await this.getFirestoreInstance();
        if (firestore) {
          const docSnap = await firestore
            .collection('users')
            .doc(authenticatedUserId)
            .collection('pblSessions')
            .doc(sessionId)
            .get();
          if (docSnap.exists) {
            const data = docSnap.data() as PBLSession;
            if (data.userId === authenticatedUserId) {
              session = data;
              this.inMemoryStore.set(key, session);
            }
          }
        }
      } catch {
        // Fallback defensivo
      }
    }

    return session;
  }

  public clear(): void {
    this.inMemoryStore.clear();
    this.sessionWriteQueues.clear();
  }
}

export const pblServerSessionRepository = new PBLServerSessionRepository();
