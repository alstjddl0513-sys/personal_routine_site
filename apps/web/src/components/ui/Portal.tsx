'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// No-op subscribe: the client/server split never changes after hydration,
// so React only needs the two snapshot readers to know it should flip once.
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

// body로 빠지는 창 · 드롭다운이 화면 구역의 토큰 덮어쓰기(예: 관리자 .admin-scope)를 같이 받게
// 감쌀 클래스. 없으면 그대로.
const PortalScopeContext = createContext<string | null>(null);

export function PortalScope({ className, children }: { className: string; children: ReactNode }) {
  return <PortalScopeContext.Provider value={className}>{children}</PortalScopeContext.Provider>;
}

// Client-only portal into document.body. Returns null during SSR and the
// hydration render so server markup matches, then flips to a portal on the
// commit-after-hydration re-render — same effect as the classic
// `useEffect(() => setMounted(true), [])` guard but without a synchronous
// setState in effect (which react-hooks/set-state-in-effect flags).
export function Portal({ children }: { children: ReactNode }) {
  const scope = useContext(PortalScopeContext);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  if (!mounted) return null;
  return createPortal(
    // display: contents — 감싼 div가 fixed 배치 · 레이아웃에 끼지 않게
    scope ? <div className={`${scope} contents`}>{children}</div> : children,
    document.body,
  );
}
