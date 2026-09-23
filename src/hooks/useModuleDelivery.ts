import { useEffect, useState } from 'react';
import type { ModuleData } from '../types/suveca';
import { loadModule } from '../lib/moduleDelivery';
export function useModuleDelivery(id: string | null) {
  const [module, setModule] = useState<ModuleData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setModule(null); setError(false);
    if (!id) return;
    const controller = new AbortController();
    void loadModule(id, controller.signal).then(value => {
      if (!controller.signal.aborted) setModule(value);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [id, attempt]);
  return { module: module?.id === id ? module : null, error, retry: () => setAttempt(n => n + 1) };
}
