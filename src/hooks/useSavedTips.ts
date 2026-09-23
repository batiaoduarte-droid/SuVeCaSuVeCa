import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { auth, db, isLocalAuthActive } from '../lib/firebase';
import { emptySavedTips, mergeSavedTips, normalizeSavedTips, readSavedTips, savedTipsKey, type SavedTipsState } from '../lib/savedTips';

export function useSavedTips(userId?: string) {
  const scope = userId || 'guest';
  const [view, setView] = useState({ scope, state: readSavedTips(userId), message: '' });
  const current = useRef(view);
  const generation = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const canSync = () => Boolean(userId && !isLocalAuthActive() && auth.currentUser?.uid === userId);

  const publish = useCallback((state: SavedTipsState, message = '') => {
    try { localStorage.setItem(savedTipsKey(userId), JSON.stringify(state)); }
    catch { message = 'Não foi possível salvar neste dispositivo. Verifique o armazenamento do navegador.'; }
    current.current = { scope, state, message };
    setView(current.current);
  }, [scope, userId]);

  const sync = useCallback(() => {
    const version = generation.current;
    queue.current = queue.current.catch(() => {}).then(async () => {
      if (version !== generation.current || current.current.scope !== scope || !canSync()) return;
      const local = current.current.state;
      try {
        const reference = doc(db, 'users', userId!, 'data', 'saved_tips');
        const merged = await runTransaction(db, async transaction => {
          const remote = await transaction.get(reference);
          const next = mergeSavedTips(normalizeSavedTips(remote.data()), local);
          transaction.set(reference, next);
          return next;
        });
        if (version === generation.current && current.current.scope === scope) publish(mergeSavedTips(merged, current.current.state));
      } catch {
        if (version === generation.current) publish(current.current.state, 'Salvo neste dispositivo. Sincronização pendente; tente novamente quando estiver conectado.');
      }
    });
    return queue.current;
  }, [scope, userId, publish]);

  useEffect(() => {
    const version = ++generation.current;
    publish(readSavedTips(userId));
    if (canSync()) {
      void getDoc(doc(db, 'users', userId!, 'data', 'saved_tips')).then(snapshot => {
        if (version !== generation.current) return;
        publish(mergeSavedTips(normalizeSavedTips(snapshot.data()), current.current.state));
        void sync();
      }).catch(() => {
        if (version === generation.current) publish(current.current.state, 'Favoritos locais disponíveis. Não foi possível sincronizar sua conta.');
      });
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === savedTipsKey(userId)) publish(mergeSavedTips(current.current.state, readSavedTips(userId)));
    };
    const onOnline = () => { void sync(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('online', onOnline);
    return () => { generation.current++; window.removeEventListener('storage', onStorage); window.removeEventListener('online', onOnline); };
  }, [userId, publish, sync]);

  const state = view.scope === scope ? view.state : emptySavedTips();
  const toggle = (id: string) => {
    if (current.current.scope !== scope) return;
    const state = current.current.state;
    const previous = state.entries[id];
    publish({ schemaVersion: 1, entries: { ...state.entries, [id]: {
      saved: !previous?.saved, updatedAt: Math.max(Date.now(), (previous?.updatedAt || 0) + 1),
    } } });
    void sync();
  };
  return { savedIds: Object.keys(state.entries).filter(id => state.entries[id].saved), toggle, sync, message: view.scope === scope ? view.message : '' };
}
