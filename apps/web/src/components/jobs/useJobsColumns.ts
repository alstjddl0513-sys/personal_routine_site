'use client';

import { useSyncExternalStore } from 'react';

// 채용 표 열 보기 ('자세히' | '간단히'). 기기별 취향이라 localStorage에만 저장.
//
// 서버는 저장값을 모르니 표는 두 열 구성을 다 그리고, 어느 쪽을 보일지는
// <html data-jobs-columns="compact"> 유무로 CSS가 정함(FULL_ONLY / COMPACT_ONLY).
// 속성은 app/layout.tsx의 초기화 스크립트(테마와 같이)가 그리기 전에 달아서
// 새로고침해도 '자세히'가 잠깐 보이지 않음. 키를 바꾸면 그 스크립트도 같이.
// React 상태(useSyncExternalStore)는 토글 눌림 표시·사이드 패널용.
export type JobsColumns = 'full' | 'compact';

const STORAGE_KEY = 'rally.jobs.columns';
const ATTR = 'jobsColumns'; // <html data-jobs-columns>

// 속성에 따라 보이기: 자세히 전용 / 간단히 전용.
export const FULL_ONLY = '[[data-jobs-columns=compact]_&]:hidden';
export const COMPACT_ONLY = 'hidden [[data-jobs-columns=compact]_&]:table-cell';
const DEFAULT: JobsColumns = 'full';
const listeners = new Set<() => void>();
// 저장이 막힌 환경(시크릿 모드 등)에서도 이번 탭에선 전환되게 메모리에도 둠.
let memory: JobsColumns | null = null;

function read(): JobsColumns {
  if (memory) return memory;
  if (document.documentElement.dataset[ATTR] === 'compact') return 'compact';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'compact' ? 'compact' : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useJobsColumns(): [JobsColumns, (next: JobsColumns) => void] {
  const columns = useSyncExternalStore(subscribe, read, () => DEFAULT);

  function setColumns(next: JobsColumns) {
    memory = next;
    if (next === 'compact') document.documentElement.dataset[ATTR] = 'compact';
    else delete document.documentElement.dataset[ATTR];
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    listeners.forEach((fn) => fn());
  }

  return [columns, setColumns];
}
