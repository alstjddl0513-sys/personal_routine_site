'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useOptimistic, useRef, useTransition } from 'react';
import type { QuestionCategory } from '@repo/shared';
import { patchMyPreferences } from '../../lib/api';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';

type FilterMode = 'daily' | 'review' | 'favorites';

interface Props {
  categories: QuestionCategory[];
  selected: readonly string[];
  /** preferences.learn의 어떤 키에 저장할지. 서버 컴포넌트가 URL 부재 시
   *  fallback으로 읽는 값과 짝. */
  mode: FilterMode;
}

const PATCH_DEBOUNCE_MS = 500;

// 카테고리 고르기(칩·빈 상태 [전체 보기] 공용). 단일 선택, 고른 칩을 다시 누르면 전체.
// URL `?categories=<key>`로 상태 보존 + 쿠키 즉시 write + profiles.preferences.learn.
// [mode]Categories로 서버 sync(debounce). 필터가 바뀌면 `?q=`는 제거, 그 외 파라미터
// (review의 ?mode=favorites 등)는 유지. preferences 값은 string[](원소 0 또는 1개).
//
// 체감 개선(2026-09-30): hover/focus 시 대상 URL `router.prefetch`, `useOptimistic`으로
// 칩 active를 클릭 즉시 반영, 연속 클릭은 마지막 것만 반영(startTransition).
function useCategorySelect(mode: FilterMode, selected: readonly string[]) {
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

  // 세션 간 선호 유지용 mirror cookie. 서버(`/learn` page.tsx)가 profile fetch 전에
  // 먼저 확인 → 있으면 profile RTT skip. 값: CSV, 빈 문자열 = 명시적 '전체'. 1년, Lax.
  function writeCookie(nextArr: string[]) {
    const cookieName = `rally.learn.${mode}`;
    const csv = nextArr.join(',');
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${cookieName}=${encodeURIComponent(csv)}; path=/; max-age=31536000; SameSite=Lax${secure}`;
  }

  function schedulePatch(nextArr: string[]) {
    if (patchTimeoutRef.current !== null) {
      window.clearTimeout(patchTimeoutRef.current);
    }
    writeCookie(nextArr);
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

  // 빈 값이어도 파라미터 자체는 세팅 — 서버가 '명시적 전체(=[])'로 인식.
  // 안 그러면 '전체' 클릭 시 preferences fallback으로 이전 선택이 돌아옴.
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

  function prefetch(key: string | null) {
    router.prefetch(buildUrl(nextArrFor(key)));
  }

  return { activeSet, apply, prefetch };
}

export function CategoryFilterChips({ categories, selected, mode }: Props) {
  const { activeSet, apply, prefetch } = useCategorySelect(mode, selected);
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
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

// 빈 상태 [전체 보기] — 칩의 '전체'와 같은 길(쿠키·설정 저장 포함). 빈 상태의 유일한 행동이라 숲색으로 채움
export function ShowAllCategoriesButton({
  mode,
  selected,
}: {
  mode: FilterMode;
  selected: readonly string[];
}) {
  const { apply, prefetch } = useCategorySelect(mode, selected);
  return (
    <button
      type="button"
      onClick={() => apply(null)}
      onMouseEnter={() => prefetch(null)}
      onFocus={() => prefetch(null)}
      className={BUTTON_PRIMARY}
    >
      전체 보기
    </button>
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
      className={`inline-flex h-9 cursor-pointer items-center rounded-[18px] px-3.5 text-sm transition-colors ${
        active
          ? 'bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
          : 'bg-surface font-medium text-ink-soft shadow-[inset_0_0_0_1px_var(--rally-btn-border)] hover:bg-row-hover'
      }`}
    >
      {label}
    </button>
  );
}
