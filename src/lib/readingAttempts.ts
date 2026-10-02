import { doc, runTransaction } from 'firebase/firestore';
import { auth, db, isLocalAuthActive } from './firebase';

export interface ReadingAttempt {
  id: string;
  questionId: string;
  lessonId: string;
  answer: string;
  correct: boolean;
  confidenceSource?: 'explicit' | 'legacy_unknown';
  confidence: 'guess' | 'low' | 'medium' | 'high';
  justification: string;
  assistanceLevel?: 'none' | 'full';
  createdAt: string;
}
export const READING_ATTEMPT_EVENT = 'suveca:reading-attempt';
export const READING_ATTEMPTS_UPDATED = 'suveca:reading-attempts-updated';
const key = (uid?: string) => `suveca_reading_attempts_v1_${uid || 'guest'}`;
const valid = (value: unknown): value is ReadingAttempt => {
  const a = value as ReadingAttempt;
  return !!a && typeof a.id === 'string' && typeof a.questionId === 'string'
    && typeof a.lessonId === 'string' && typeof a.answer === 'string'
    && typeof a.correct === 'boolean' && ['guess', 'low', 'medium', 'high'].includes(a.confidence)
    && typeof a.justification === 'string' && Number.isFinite(Date.parse(a.createdAt));
};
const merge = (...collections: ReadingAttempt[][]) => [...new Map(collections.flat().filter(valid).map(a => [a.id, a])).values()]
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(-500);
export function readReadingAttempts(uid?: string): ReadingAttempt[] {
  try { const data = JSON.parse(localStorage.getItem(key(uid)) || '[]'); return Array.isArray(data) ? merge(data) : []; }
  catch { return []; }
}
const remoteAllowed = (uid?: string) => !!uid && uid !== 'guest' && !isLocalAuthActive() && auth.currentUser?.uid === uid;
function write(uid: string | undefined, attempts: ReadingAttempt[]) {
  localStorage.setItem(key(uid), JSON.stringify(attempts));
  window.dispatchEvent(new CustomEvent(READING_ATTEMPTS_UPDATED, { detail: { userId: uid || 'guest' } }));
}
export async function restoreReadingAttempts(uid?: string): Promise<void> {
  if (!remoteAllowed(uid)) return;
  const merged = await runTransaction(db, async transaction => {
    const ref = doc(db, 'users', uid!, 'data', 'reading_attempts');
    const snapshot = await transaction.get(ref);
    if (!remoteAllowed(uid)) throw new Error('A conta foi alterada.');
    const cloud = snapshot.data()?.attempts;
    const attempts = merge(Array.isArray(cloud) ? cloud : [], readReadingAttempts(uid));
    transaction.set(ref, { schemaVersion: 1, attempts });
    return attempts;
  });
  if (!remoteAllowed(uid)) return;
  write(uid, merge(merged, readReadingAttempts(uid)));
}
export async function saveReadingAttempt(uid: string | undefined, attempt: ReadingAttempt, onLocalSave?: () => void): Promise<boolean> {
  if (!valid(attempt)) throw new Error('Tentativa inválida.');
  const attempts = merge(readReadingAttempts(uid), [attempt]);
  write(uid, attempts); // Local first; a failure here must not claim that the answer was saved.
  onLocalSave?.();
  if (!remoteAllowed(uid)) return true;
  try {
    await runTransaction(db, async transaction => {
      const ref = doc(db, 'users', uid!, 'data', 'reading_attempts');
      const snapshot = await transaction.get(ref);
      if (!remoteAllowed(uid)) throw new Error('A conta foi alterada.');
      const cloud = snapshot.data()?.attempts;
      transaction.set(ref, { schemaVersion: 1, attempts: merge(Array.isArray(cloud) ? cloud : [], attempts) });
    });
    return true;
  } catch { return false; }
}
