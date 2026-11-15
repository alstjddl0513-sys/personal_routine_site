'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';

// 블로그 '새 글' 점 · '읽은 글' 흐리게 — 이 브라우저에만 기억(DB X, 기기마다 따로).

const SEEN_KEY = 'rally.blog.lastSeenAt';
const READ_KEY = 'rally.blog.read';
const READ_EVENT = 'rally.blog.readChanged';
const READ_MAX = 500; // 오래된 것부터 버림

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 사생활 보호 모드 등 — 기억 못 해도 화면은 그대로 동작
  }
}

// ── 새 글: 이번 방문 '전'에 마지막으로 본 시각. 페이지를 처음 읽는 순간 한 번만 잡아둠
// (방문 중에 갱신해도 점이 사라지지 않게). 처음 방문이면 null → 점 없음(180개가 다 새 글로 뜨지 않게)
let visitBaseline: string | null | undefined;
function getBaseline(): string | null {
  if (visitBaseline === undefined) visitBaseline = safeGet(SEEN_KEY);
  return visitBaseline;
}
const noopSubscribe = () => () => {};

/** 이 시각 뒤에 가져온 글이 '새 글'. 화면을 연 뒤 지금 시각을 마지막으로 본 시각으로 저장 */
export function useBlogLastSeen(): string | null {
  const baseline = useSyncExternalStore(noopSubscribe, getBaseline, () => null);
  useEffect(() => {
    getBaseline();
    safeSet(SEEN_KEY, new Date().toISOString());
  }, []);
  return baseline;
}

// ── 읽은 글: 눌러본 글 id 목록
function subscribeRead(cb: () => void) {
  window.addEventListener(READ_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(READ_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function useBlogRead(): { isRead: (id: string) => boolean; markRead: (id: string) => void } {
  const raw = useSyncExternalStore(subscribeRead, () => safeGet(READ_KEY), () => null);
  const ids = useMemo(() => {
    try {
      const arr: unknown = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []);
    } catch {
      return new Set<string>();
    }
  }, [raw]);
  const markRead = useCallback(
    (id: string) => {
      if (ids.has(id)) return;
      const next = [...ids, id].slice(-READ_MAX);
      safeSet(READ_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(READ_EVENT));
    },
    [ids],
  );
  return { isRead: (id) => ids.has(id), markRead };
}
