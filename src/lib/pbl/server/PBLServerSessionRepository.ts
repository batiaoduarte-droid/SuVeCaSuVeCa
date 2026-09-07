import type { PBLSession } from '../../../types/pbl';

export class PBLServerSessionRepository {
  // O cache em memória utiliza chave composta "userId::sessionId" para garantir isolamento estrito entre usuários
  private inMemoryStore = new Map<string, PBLSession>();

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
   * Protege contra snapshots concorrentes fora de ordem (não sobrescreve estado mais recente com mais antigo).
   */
  public saveSession(session: PBLSession, authenticatedUserId?: string): void {
    if (!session || !session.sessionId) return;
    if (!authenticatedUserId || authenticatedUserId === 'guest') {
      // Usuários não autenticados ou convidados não possuem persistência remota no servidor
      return;
    }

    const key = this.buildKey(authenticatedUserId, session.sessionId);
    const existing = this.inMemoryStore.get(key);

    // Proteção contra sobrescrita fora de ordem por snapshots mais antigos
    if (existing?.updatedAt && session.updatedAt) {
      const existingTime = new Date(existing.updatedAt).getTime();
      const incomingTime = new Date(session.updatedAt).getTime();
      if (!isNaN(existingTime) && !isNaN(incomingTime) && incomingTime < existingTime) {
        // Snapshot antigo descartado em favor do estado mais recente já gravado
        return;
      }
    }

    const enrichedSession: PBLSession = {
      ...session,
      userId: authenticatedUserId,
    };
    this.inMemoryStore.set(key, enrichedSession);

    this.getFirestoreInstance().then((firestore) => {
      if (firestore) {
        firestore
          .collection('users')
          .doc(authenticatedUserId)
          .collection('pblSessions')
          .doc(session.sessionId)
          .set(enrichedSession, { merge: true })
          .catch(() => {
            // Non-blocking background sync
          });
      }
    }).catch(() => {});
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
  }
}

export const pblServerSessionRepository = new PBLServerSessionRepository();
