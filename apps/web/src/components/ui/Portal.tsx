'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// No-op subscribe: the client/server split never changes after hydration,
// so React only needs the two snapshot readers to know it should flip once.
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// Client-only portal into document.body. Returns null during SSR and the
// hydration render so server markup matches, then flips to a portal on the
// commit-after-hydration re-render — same effect as the classic
// `useEffect(() => setMounted(true), [])` guard but without a synchronous
// setState in effect (which react-hooks/set-state-in-effect flags).
export function Portal({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  if (!mounted) return null;
  return createPortal(children, document.body);
}
