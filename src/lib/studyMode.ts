import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isLocalAuthActive, safeSetDoc } from './firebase';

export type StudyMode = 'complete' | 'pbl_only';
export const STUDY_MODE_EVENT = 'suveca:study-mode-changed';
export const studyPreferencesKey = (uid?: string) => `suveca_study_prefs_${uid || 'guest'}`;
const normalize = (value: unknown): StudyMode => value === 'pbl_only' ? 'pbl_only' : 'complete';
export function readStudyMode(uid?: string): StudyMode {
  try { return normalize(JSON.parse(localStorage.getItem(studyPreferencesKey(uid)) || '{}').studyMode); }
  catch { return 'complete'; }
}
export function announceStudyMode(mode: StudyMode, uid?: string) {
  window.dispatchEvent(new CustomEvent(STUDY_MODE_EVENT, { detail: { mode, userId: uid || 'guest' } }));
}
function storeMode(mode: StudyMode, uid?: string) {
  try {
    const value = JSON.parse(localStorage.getItem(studyPreferencesKey(uid)) || '{}');
    localStorage.setItem(studyPreferencesKey(uid), JSON.stringify({ ...value, studyMode: mode }));
  } catch { /* the active navigation still updates when storage is unavailable */ }
  announceStudyMode(mode, uid);
}
export function useStudyMode(uid?: string): [StudyMode, () => void] {
  const scope = uid || 'guest';
  const [state, setState] = useState({ scope, mode: readStudyMode(uid) });
  useEffect(() => {
    let cancelled = false;
    let changed = false;
    setState({ scope, mode: readStudyMode(uid) });
    const update = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.userId !== scope) return;
      changed = true; setState({ scope, mode: normalize(detail.mode) });
    };
    const storage = (event: StorageEvent) => {
      if (event.key === studyPreferencesKey(uid)) { changed = true; setState({ scope, mode: readStudyMode(uid) }); }
    };
    window.addEventListener(STUDY_MODE_EVENT, update); window.addEventListener('storage', storage);
    if (uid && !isLocalAuthActive() && auth.currentUser?.uid === uid) {
      void getDoc(doc(db, 'users', uid, 'data', 'study_preferences')).then(snapshot => {
        if (!cancelled && !changed && snapshot.exists()) storeMode(normalize(snapshot.data().studyMode), uid);
      }).catch(() => {});
    }
    return () => { cancelled = true; window.removeEventListener(STUDY_MODE_EVENT, update); window.removeEventListener('storage', storage); };
  }, [uid, scope]);
  const restoreComplete = () => {
    storeMode('complete', uid);
    if (uid && !isLocalAuthActive() && auth.currentUser?.uid === uid) {
      void safeSetDoc(doc(db, 'users', uid, 'data', 'study_preferences'), { studyMode: 'complete' }, { merge: true }).catch(() => {});
    }
  };
  return [state.scope === scope ? state.mode : readStudyMode(uid), restoreComplete];
}
