'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { TABLE_ICON_BUTTON } from './table-style';

export function FavoriteToggle({
  id,
  value,
  variant,
}: {
  id: string;
  value: boolean;
  variant?: 'table';
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(value);
  // Counts PATCH+refresh cycles that haven't fully settled. While > 0 the
  // effect below won't overwrite optimistic state with a possibly-stale
  // server prop (router.refresh from an earlier click can land after a
  // later click has already updated local state).
  const inFlightRef = useRef(0);

  useEffect(() => {
    if (inFlightRef.current > 0) return;
    setCurrent(value);
  }, [value]);

  function toggle() {
    const prev = current;
    const next = !current;
    setCurrent(next);
    inFlightRef.current++;
    patchCompany(id, { isFavorite: next })
      .then(() => {
        router.refresh();
      })
      .catch((err) => {
        console.error(err);
        setCurrent(prev);
      })
      .finally(() => {
        inFlightRef.current--;
      });
  }

  if (variant === 'table') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={current}
        aria-label={current ? '즐겨찾기 해제' : '즐겨찾기'}
        className={`${TABLE_ICON_BUTTON} hover:bg-row-hover`}
      >
        <Heart
          className={`h-4 w-4 ${current ? 'fill-heart text-heart' : 'text-icon-faint'}`}
          strokeWidth={1.8}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={current}
      aria-label={current ? '즐겨찾기 해제' : '즐겨찾기'}
      // 모바일 카드 — 하트는 16px 그대로, 누르는 영역만 44px(바깥 여백을 음수로 당겨 카드 줄 높이는 그대로)
      className="-m-2.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <Heart
        className={`h-4 w-4 ${
          current
            ? 'fill-rose-500 text-rose-500'
            : 'text-zinc-300 dark:text-zinc-600'
        }`}
        aria-hidden
      />
    </button>
  );
}
