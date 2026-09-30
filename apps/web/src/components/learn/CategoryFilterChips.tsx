'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useOptimistic, useRef, useTransition } from 'react';
import type { QuestionCategory } from '@repo/shared';
import { patchMyPreferences } from '../../lib/api';

type FilterMode = 'daily' | 'review' | 'favorites';

interface Props {
  categories: QuestionCategory[];
  selected: readonly string[];
  /** preferences.learn의 어떤 키에 저장할지. 서버 컴포넌트가 URL 부재 시
   *  fallback으로 읽는 값과 짝. */
  mode: FilterMode;
}

const PATCH_DEBOUNCE_MS = 500;

// 카테고리 chip 단일 선택. 활성 chip 다시 누르면 초기화(전체). URL
// `?categories=<key>`로 상태 보존하고 동시에 profiles.preferences.learn.
// [mode]Categories로 서버 sync (debounce). URL이 없을 때만 preferences가
// fallback으로 쓰이므로 소프트 네비게이션 시에도 최근 선택이 유지됨.
// 필터가 바뀌면 daily set이 달라지므로 `?q=`는 제거. 그 외 파라미터
// (review 페이지의 ?mode=favorites 등)는 유지. preferences 값은 string[] 유지
// (히스토리 호환) — 실질적으로 원소 0 또는 1개.
//
// 체감 개선(2026-09-30): (1) hover/focus 시 대상 URL을 `router.prefetch`로
// warm-up해 클릭 시엔 RSC payload가 캐시에 있음. (2) `useOptimistic`으로 chip
// active 표시를 클릭 즉시 반영 — 실 SSR 왕복은 그대로지만 "눌렀는데 반응 없음"
// 구간이 사라짐. (3) `disabled={isPending}` 제거해 사용자가 chip을 연속으로
// 눌러도 마지막 것만 반영됨(startTransition 특성). 카드 영역까지 pending
// skeleton으로 갈아치우려면 chips↔card 간 transition state 공유가 필요해
// 이번엔 skip.
export function CategoryFilterChips({ categories, selected, mode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [optimisticSelected, applyOptimistic] = useOptimistic(
    selected,
    (_: readonly string[], next: readonly string[]) => next,
  );
  const patchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (patchTimeoutRef.current !== null) {
        window.clearTimeout(patchTimeoutRef.current);
      }
    };
  }, []);

  const activeSet = new Set(optimisticSelected);

  function schedulePatch(nextArr: string[]) {
    if (patchTimeoutRef.current !== null) {
      window.clearTimeout(patchTimeoutRef.current);
    }
    const key =
      mode === 'daily'
        ? 'dailyCategories'
        : mode === 'review'
          ? 'reviewCategories'
          : 'favoritesCategories';
    patchTimeoutRef.current = window.setTimeout(() => {
      patchMyPreferences({ learn: { [key]: nextArr } }).catch((err) => {
        console.error('[CategoryFilterChips] preferences PATCH failed', err);
      });
    }, PATCH_DEBOUNCE_MS);
  }

  // 빈 값이어도 파라미터 자체는 세팅해서 서버가 '명시적 전체(=[])'로 인식
  // 하게 만듦. 안 그러면 '전체' 클릭 시 URL에 categories가 사라지고 서버가
  // preferences fallback으로 넘어가 debounced PATCH 완료 전엔 이전 선택이
  // 그대로 돌아옴 (한 번 클릭으로 안 넘어가는 버그).
  function buildUrl(next: readonly string[]): string {
    const csv = next.join(',');
    const params = new URLSearchParams();
    searchParams.forEach((v, k) => {
      if (k === 'categories' || k === 'q') return;
      params.set(k, v);
    });
    params.set('categories', csv);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function nextArrFor(key: string | null): string[] {
    if (key === null) return [];
    if (activeSet.has(key)) return [];
    return [key];
  }

  function apply(key: string | null) {
    const nextArr = nextArrFor(key);
    if (key === null && activeSet.size === 0) return;
    const url = buildUrl(nextArr);
    startTransition(() => {
      applyOptimistic(nextArr);
      router.push(url);
    });
    schedulePatch(nextArr);
  }

  // Hover/focus 진입 시 다음에 눌릴 만한 URL을 미리 warm-up. Next가 동일 URL은
  // 자동 dedupe하므로 연속 hover에도 요청은 한 번만.
  function prefetch(key: string | null) {
    router.prefetch(buildUrl(nextArrFor(key)));
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipButton
        active={activeSet.size === 0}
        onClick={() => apply(null)}
        onHover={() => prefetch(null)}
        label="전체"
      />
      {categories.map((c) => (
        <ChipButton
          key={c.id}
          active={activeSet.has(c.key)}
          onClick={() => apply(c.key)}
          onHover={() => prefetch(c.key)}
          label={c.label}
        />
      ))}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  onHover,
  label,
}: {
  active: boolean;
  onClick: () => void;
  onHover: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHover}
      onFocus={onHover}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
      }`}
    >
      {label}
    </button>
  );
}
