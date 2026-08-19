import type { PBLSession, CompetencyMastery } from '../../../types/pbl';
import { db } from '../../firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

const LOCAL_STORAGE_KEY_PREFIX = 'suveca_pbl_session_';
const LOCAL_STORAGE_MASTERY_PREFIX = 'suveca_pbl_mastery_';

export class PBLSessionRepository {
  public static async saveSession(session: PBLSession): Promise<void> {
    try {
      // 1. Save to LocalStorage immediately
      const key = `${LOCAL_STORAGE_KEY_PREFIX}${session.sessionId}`;
      localStorage.setItem(key, JSON.stringify(session));

      // 2. Also save masteries in LocalStorage
      const masteryKey = `${LOCAL_STORAGE_MASTERY_PREFIX}${session.userId}`;
      const existingMasteryStr = localStorage.getItem(masteryKey);
      const existingMastery = existingMasteryStr ? JSON.parse(existingMasteryStr) : {};
      const mergedMastery = { ...existingMastery, ...session.masterySnapshot };
      localStorage.setItem(masteryKey, JSON.stringify(mergedMastery));

      // 3. Sync to Firestore if user is authenticated
      if (session.userId && session.userId !== 'guest' && db) {
        const sessionRef = doc(db, 'users', session.userId, 'pblSessions', session.sessionId);
        await setDoc(sessionRef, session, { merge: true });

        // Save mastery subcollection
        for (const [compId, mastery] of Object.entries(session.masterySnapshot)) {
          const masteryRef = doc(db, 'users', session.userId, 'pblMastery', compId);
          await setDoc(masteryRef, mastery, { merge: true });
        }
      }
    } catch (err) {
      console.warn('[PBLSessionRepository] Storage error:', err);
    }
  }

  public static async getSession(sessionId: string, userId?: string): Promise<PBLSession | null> {
    try {
      const key = `${LOCAL_STORAGE_KEY_PREFIX}${sessionId}`;
      const local = localStorage.getItem(key);
      if (local) return JSON.parse(local);

      if (userId && userId !== 'guest' && db) {
        const sessionRef = doc(db, 'users', userId, 'pblSessions', sessionId);
        const snap = await getDoc(sessionRef);
        if (snap.exists()) return snap.data() as PBLSession;
      }
    } catch (err) {
      console.warn('[PBLSessionRepository] Error retrieving session:', err);
    }
    return null;
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
