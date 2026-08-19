'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Heart, Search, X } from 'lucide-react';
import {
  COMPANY_TYPE_2_LABELS,
  COMPANY_TYPE_2_VALUES,
  type CompanyType2,
} from '@repo/shared';

const TYPE2_OPTIONS: (CompanyType2 | 'all')[] = ['all', ...COMPANY_TYPE_2_VALUES];

export function JobsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentType2 = searchParams.get('type2');
  const currentFavorite = searchParams.get('favorite') === '1';
  const currentSearch = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(currentSearch);
  // track last value we pushed to URL, so URL-driven changes can sync back into local state
  const lastPushedRef = useRef(currentSearch);

  // sync input <- URL when URL changes externally (back/forward, paste, reset button)
  useEffect(() => {
    if (currentSearch !== lastPushedRef.current) {
      setSearchInput(currentSearch);
      lastPushedRef.current = currentSearch;
    }
  }, [currentSearch]);

  // debounce input -> URL
  useEffect(() => {
    if (searchInput === lastPushedRef.current) return;
    const t = setTimeout(() => {
      lastPushedRef.current = searchInput;
      pushPatch({ q: searchInput || null });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function pushPatch(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    startTransition(() => {
      router.push(next.size ? `/jobs?${next.toString()}` : '/jobs');
    });
  }

  function clearAll() {
    lastPushedRef.current = '';
    setSearchInput('');
    startTransition(() => {
      router.push('/jobs');
    });
  }

  const anyActive = currentType2 || currentFavorite || currentSearch;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search
            className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="회사명 검색"
            className="w-full rounded-md border border-zinc-300 bg-white py-2 pr-3 pl-9 text-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="button"
          onClick={() => pushPatch({ favorite: currentFavorite ? null : '1' })}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            currentFavorite
              ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
          }`}
          aria-pressed={currentFavorite}
        >
          <Heart
            className={`h-4 w-4 ${currentFavorite ? 'fill-current' : ''}`}
            aria-hidden
          />
          즐겨찾기
        </button>
        {anyActive ? (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-md px-2 py-2 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            초기화
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TYPE2_OPTIONS.map((opt) => {
          const active =
            opt === 'all' ? currentType2 === null : currentType2 === opt;
          const label = opt === 'all' ? '전체' : COMPANY_TYPE_2_LABELS[opt];
          return (
            <button
              key={opt}
              type="button"
              onClick={() => {
                // 활성 chip 재클릭 -> 해제, 그 외 -> 그 값으로 세팅. '전체'는 항상 clear.
                if (opt === 'all') {
                  pushPatch({ type2: null });
                } else if (active) {
                  pushPatch({ type2: null });
                } else {
                  pushPatch({ type2: opt });
                }
              }}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
              aria-pressed={active}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
