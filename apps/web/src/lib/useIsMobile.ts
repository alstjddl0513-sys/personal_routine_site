'use client';

import { useSyncExternalStore } from 'react';

// 모바일(md 768px 미만) 여부 — 시트(모바일)와 팝오버 · 가운데 창(데스크톱) 중 하나만 그릴 때.
// CSS로 둘 다 그려 숨기면 데스크톱에서도 시트가 스크롤을 잠가서 JS로 고름. 서버에선 false.
const QUERY = '(max-width: 767px)';

function subscribe(cb: () => void): () => void {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
