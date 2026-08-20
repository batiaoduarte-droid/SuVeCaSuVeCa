import type { PBLSession, CompetencyMastery } from '../../../types/pbl';
import { db } from '../../firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const LOCAL_STORAGE_KEY_PREFIX = 'suveca_pbl_session_';
const LOCAL_STORAGE_MASTERY_PREFIX = 'suveca_pbl_mastery_';

export class PBLSessionRepository {
  private static hydrateSession(session: PBLSession): PBLSession {
    return {
      ...session,
      competencyOutcomes: session.competencyOutcomes || {},
      reflectionNotes: session.reflectionNotes || {},
      savedErrorQuestionRefs: session.savedErrorQuestionRefs || [],
    };
  }

  public static async saveSession(session: PBLSession): Promise<{ syncedRemotely: boolean }> {
    const key = `${LOCAL_STORAGE_KEY_PREFIX}${session.sessionId}`;
    try {
      localStorage.setItem(key, JSON.stringify(session));

      // 2. Also save masteries in LocalStorage
      const masteryKey = `${LOCAL_STORAGE_MASTERY_PREFIX}${session.userId}`;
      const existingMasteryStr = localStorage.getItem(masteryKey);
      const existingMastery = existingMasteryStr ? JSON.parse(existingMasteryStr) : {};
      const mergedMastery = { ...existingMastery, ...session.masterySnapshot };
      localStorage.setItem(masteryKey, JSON.stringify(mergedMastery));

    } catch (err) {
      console.error('[PBLSessionRepository] Local storage error:', err);
      throw new Error('Não foi possível salvar a sessão neste dispositivo.');
    }

    if (session.userId && session.userId !== 'guest' && db) {
      try {
        const sessionRef = doc(db, 'users', session.userId, 'pblSessions', session.sessionId);
        await Promise.all([
          setDoc(sessionRef, session, { merge: true }),
          ...Object.entries(session.masterySnapshot).map(([compId, mastery]) => {
          const masteryRef = doc(db, 'users', session.userId, 'pblMastery', compId);
            return setDoc(masteryRef, mastery, { merge: true });
          }),
        ]);
        return { syncedRemotely: true };
      } catch (err) {
        console.warn('[PBLSessionRepository] Remote sync error:', err);
      }
    }
    return { syncedRemotely: false };
  }

  public static async getSession(sessionId: string, userId?: string): Promise<PBLSession | null> {
    try {
      const key = `${LOCAL_STORAGE_KEY_PREFIX}${sessionId}`;
      const local = localStorage.getItem(key);
      if (local) return this.hydrateSession(JSON.parse(local));

      if (userId && userId !== 'guest' && db) {
        const sessionRef = doc(db, 'users', userId, 'pblSessions', sessionId);
        const snap = await getDoc(sessionRef);
        if (snap.exists()) return this.hydrateSession(snap.data() as PBLSession);
      }
    } catch (err) {
      console.warn('[PBLSessionRepository] Error retrieving session:', err);
    }
    return null;
  }

  public static async getLatestActiveSession(userId: string): Promise<PBLSession | null> {
    try {
      const localSessions: PBLSession[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(LOCAL_STORAGE_KEY_PREFIX)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const candidate = this.hydrateSession(JSON.parse(raw));
        if (candidate.userId === userId && candidate.status === 'active') localSessions.push(candidate);
      }
      localSessions.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      if (localSessions[0]) return localSessions[0];

      if (userId !== 'guest' && db) {
        const sessionsQuery = query(
          collection(db, 'users', userId, 'pblSessions'),
          orderBy('updatedAt', 'desc'),
          limit(10)
        );
        const snaps = await getDocs(sessionsQuery);
        const active = snaps.docs
          .map((snapshot) => this.hydrateSession(snapshot.data() as PBLSession))
          .find((candidate) => candidate.status === 'active');
        return active || null;
      }
    } catch (err) {
      console.warn('[PBLSessionRepository] Error retrieving active session:', err);
    }
    return null;
  }

  public static async abandonSession(session: PBLSession): Promise<void> {
    session.status = 'abandoned';
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);
  }

  public static async getUserMastery(userId: string): Promise<Record<string, CompetencyMastery>> {
    try {
      const masteryKey = `${LOCAL_STORAGE_MASTERY_PREFIX}${userId}`;
      const local = localStorage.getItem(masteryKey);
      if (local) return JSON.parse(local);

      if (userId && userId !== 'guest' && db) {
        const masteryCol = collection(db, 'users', userId, 'pblMastery');
        const snaps = await getDocs(masteryCol);
        const result: Record<string, CompetencyMastery> = {};
        snaps.forEach((d) => {
          result[d.id] = d.data() as CompetencyMastery;
        });
        return result;
      }
    } catch (err) {
      console.warn('[PBLSessionRepository] Error retrieving mastery:', err);
    }
    return {};
  }
}
