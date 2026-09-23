import { useEffect, useState, type ReactNode } from 'react';

/** Defer effects and rendering until opened, then preserve the child's state. */
export function MountOnFirstOpen({ open, children }: { open: boolean; children: ReactNode }) {
  const [visited, setVisited] = useState(open);
  useEffect(() => { if (open) setVisited(true); }, [open]);
  return open || visited ? children : null;
}
