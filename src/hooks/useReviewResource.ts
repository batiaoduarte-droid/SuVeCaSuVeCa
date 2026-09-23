import { useEffect, useState } from 'react';
import type { ReviewResource } from '../types/reviewResource';
import { loadReviewResource } from '../lib/reviewResources';

export function useReviewResource(cardId?: string) {
  const [state, setState] = useState<{ id?: string; resource: ReviewResource | null; error: boolean }>({ resource: null, error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!cardId) return;
    const controller = new AbortController();
    loadReviewResource(cardId, controller.signal).then(resource => {
      if (!controller.signal.aborted) setState({ id: cardId, resource, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ id: cardId, resource: null, error: true });
    });
    return () => controller.abort();
  }, [cardId, attempt]);
  return { resource: state.id === cardId ? state.resource : null, error: state.id === cardId && state.error, retry: () => setAttempt(n => n + 1) };
}

