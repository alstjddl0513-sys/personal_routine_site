'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useTransition } from 'react';
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

// 카테고리 chip 다중 선택. URL `?categories=<csv>`로 상태 보존하고, 동시에
// profiles.preferences.learn.[mode]Categories로 서버 sync (debounce). URL이
// 없을 때만 preferences가 fallback으로 쓰이므로 소프트 네비게이션 시에도
// 최근 선택이 유지됨. 필터가 바뀌면 daily set이 달라지므로 `?q=`는 제거.
// 그 외 파라미터(review 페이지의 ?mode=favorites 등)는 유지.
export function CategoryFilterChips({ categories, selected, mode }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const patchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (patchTimeoutRef.current !== null) {
        window.clearTimeout(patchTimeoutRef.current);
      }
    };
  }, []);

  const set = new Set(selected);

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

  function apply(next: Set<string>) {
    const nextArr = Array.from(next);
    const csv = nextArr.join(',');
    const params = new URLSearchParams();
    searchParams.forEach((v, k) => {
      if (k === 'categories' || k === 'q') return;
      params.set(k, v);
    });
    if (csv) params.set('categories', csv);
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
    schedulePatch(nextArr);
  }

  function toggle(key: string) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  }

  function clearAll() {
    if (set.size === 0) return;
    apply(new Set());
  }

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChipButton
        active={set.size === 0}
        disabled={isPending}
        onClick={clearAll}
        label="전체"
      />
      {categories.map((c) => (
        <ChipButton
          key={c.id}
          active={set.has(c.key)}
          disabled={isPending}
          onClick={() => toggle(c.key)}
          label={c.label}
        />
      ))}
    </div>
  );
}

function ChipButton({
  active,
  disabled,
  onClick,
  label,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
        active
          ? 'border-emerald-500 bg-emerald-500 text-white'
          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900'
      }`}
    >
      {label}
    </button>
  );
}
