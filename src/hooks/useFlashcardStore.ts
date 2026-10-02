import { useCallback, useEffect, useRef, useState } from 'react';
import { canSyncFlashcards, FLASHCARD_STORE_EVENT, hasPendingFlashcards, materializeCards, readStoredFlashcards, recoverLocalCards, syncFlashcards } from '../lib/flashcardStore';

export function useFlashcardStore(uid?: string) {
  const [state, setState] = useState(() => {
    try { return { uid, cards: readStoredFlashcards(uid) }; }
    catch { return { uid, cards: materializeCards([]) }; }
  });
  const [status, setStatus] = useState<'loading' | 'local' | 'synced' | 'pending' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const scope = useRef(uid); scope.current = uid;
  const mounted = useRef(false);
  const running = useRef<{ uid?: string; token: symbol } | null>(null);
  const refresh = useCallback(() => { if (mounted.current && scope.current === uid) setState({ uid, cards: readStoredFlashcards(uid) }); }, [uid]);
  const retry = useCallback(async () => {
    if (running.current && running.current.uid === uid) return;
    const token = Symbol(); running.current = { uid, token };
    try {
      const recovery = recoverLocalCards(uid);
      if (recovery.failures.length) throw new Error(recovery.failures.join(' '));
      refresh();
      if (canSyncFlashcards(uid)) await syncFlashcards(uid!);
      if (mounted.current && scope.current === uid) {
        refresh(); setMessage('');
        setStatus(canSyncFlashcards(uid) ? hasPendingFlashcards(uid) ? 'pending' : 'synced' : 'local');
      }
    } catch (error) {
      if (mounted.current && scope.current === uid) {
        try { refresh(); } catch { /* Keep the last readable state. */ }
        setStatus('error'); setMessage((error as Error).message || 'Sincronização indisponível.');
      }
    } finally { if (running.current?.token === token) running.current = null; }
  }, [uid, refresh]);
  useEffect(() => {
    mounted.current = true; setStatus('loading'); setMessage('');
    void retry();
    const updated = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== (uid || 'guest')) return;
      try {
        refresh();
        if (canSyncFlashcards(uid) && hasPendingFlashcards(uid)) setStatus('pending');
      } catch (error) { setStatus('error'); setMessage((error as Error).message); }
    };
    window.addEventListener(FLASHCARD_STORE_EVENT, updated);
    window.addEventListener('storage', updated);
    window.addEventListener('online', retry);
    window.addEventListener('focus', retry);
    const timer = window.setInterval(() => {
      if (canSyncFlashcards(uid) && navigator.onLine) void retry();
    }, 60_000);
    return () => { mounted.current = false; clearInterval(timer); window.removeEventListener(FLASHCARD_STORE_EVENT, updated); window.removeEventListener('storage', updated); window.removeEventListener('online', retry); window.removeEventListener('focus', retry); };
  }, [uid, retry, refresh]);
  const reportError = (error: unknown) => { setStatus('error'); setMessage((error as Error).message || 'Não foi possível salvar neste dispositivo.'); };
  return { cards: state.uid === uid ? state.cards : [], status: state.uid === uid ? status : 'loading' as const, message, retry, refresh, reportError };
}
