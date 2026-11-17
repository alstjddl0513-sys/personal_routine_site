'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, dowLabel, toISODate } from '../../lib/routines-week';
import type { MuscleGroupFilter } from '../../lib/muscle-groups';

// 모바일은 기존 44px 터치 크기, 데스크톱 40px.
const NAV_BTN =
  'inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-btn-border bg-btn-bg text-ink-soft hover:border-heading disabled:cursor-default disabled:border-divider disabled:text-icon-faint md:h-10';

// 모바일 머리 줄 — 36px 테두리 버튼, 날짜가 가운데 남는 폭을 다 씀
const COMPACT_BTN =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-btn-border text-heading disabled:cursor-default disabled:border-divider disabled:text-icon-faint';

// [오늘](다른 날짜일 때만) [‹] 11월 4일 (수) [›] — 오늘이면 [›] 비활성(미래 기록 X).
// compact(모바일): [‹] 날짜 [›] [오늘] — 머리 줄 [⚙]과 [⏱ 휴식] 사이에 끼움.
export function WorkoutDateNav({
  date,
  group,
  compact = false,
}: {
  date: Date;
  group: MuscleGroupFilter;
  compact?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function buildUrl(next: Date | null): string {
    const qs = new URLSearchParams();
    if (next) qs.set('date', toISODate(next));
    if (group !== 'all') qs.set('group', group);
    const s = qs.toString();
    return s ? `/workouts?${s}` : '/workouts';
  }

  function goto(next: Date | null) {
    startTransition(() => {
      router.push(buildUrl(next));
    });
  }

  // Hover/focus로 대상 URL RSC payload를 warm-up. 클릭 시 캐시에서 즉시 렌더.
  function prefetch(next: Date | null) {
    router.prefetch(buildUrl(next));
  }

  const todayIso = toISODate(new Date());
  const isToday = toISODate(date) === todayIso;
  const label = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dowLabel(date)})`;

  if (compact) {
    return (
      <nav aria-label="날짜 이동" className="flex min-w-0 flex-1 items-center gap-1.5">
        <button
          type="button"
          onClick={() => goto(addDays(date, -1))}
          onFocus={() => prefetch(addDays(date, -1))}
          className={COMPACT_BTN}
          aria-label="전날"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-[14.5px] font-semibold">{label}</span>
        <button
          type="button"
          onClick={() => goto(addDays(date, 1))}
          onFocus={() => prefetch(addDays(date, 1))}
          disabled={isToday}
          className={COMPACT_BTN}
          aria-label="다음날"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
        {!isToday ? (
          <button
            type="button"
            onClick={() => goto(null)}
            onFocus={() => prefetch(null)}
            className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-lg px-2 text-sm font-medium text-heading"
          >
            오늘
          </button>
        ) : null}
      </nav>
    );
  }

  return (
    <nav aria-label="날짜 이동" className="flex items-center gap-2">
      {!isToday ? (
        <button
          type="button"
          onClick={() => goto(null)}
          onMouseEnter={() => prefetch(null)}
          onFocus={() => prefetch(null)}
          className={`${NAV_BTN} px-3.5 text-sm font-medium text-btn-fg`}
        >
          오늘
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => goto(addDays(date, -1))}
        onMouseEnter={() => prefetch(addDays(date, -1))}
        onFocus={() => prefetch(addDays(date, -1))}
        className={`${NAV_BTN} w-11 md:w-10`}
        aria-label="이전날"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-28 text-center text-[15px] font-semibold">{label}</span>
      <button
        type="button"
        onClick={() => goto(addDays(date, 1))}
        onMouseEnter={() => prefetch(addDays(date, 1))}
        onFocus={() => prefetch(addDays(date, 1))}
        disabled={isToday}
        className={`${NAV_BTN} w-11 md:w-10`}
        aria-label="다음날"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </nav>
  );
}
