'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  mondayOf,
  toISODate,
  type WeekInfo,
} from '../../lib/routines-week';

// 모바일은 기존 44px 터치 크기, 데스크톱 40px.
const NAV_BTN =
  'inline-flex h-11 cursor-pointer items-center justify-center rounded-md border border-btn-border bg-btn-bg text-ink-soft hover:border-heading md:h-10';

// 모바일 ‹ › — 보이는 칸은 36px, 누르는 영역은 44px
const MOBILE_NAV_BTN =
  'group inline-flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-md text-ink-soft outline-none';
const MOBILE_NAV_BOX =
  'inline-flex h-9 w-9 items-center justify-center rounded-md border border-btn-border bg-btn-bg group-focus-visible:shadow-[0_0_0_2px_var(--rally-paper),0_0_0_4px_var(--rally-chip-on-border)]';

// "11월 2일 – 11월 8일"
function formatRange(week: WeekInfo): string {
  const a = week.monday;
  const b = week.days[6];
  return `${a.getMonth() + 1}월 ${a.getDate()}일 – ${b.getMonth() + 1}월 ${b.getDate()}일`;
}

export function RoutineWeekNav({ week }: { week: WeekInfo }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function buildUrl(date: Date | null): string {
    return date ? `/routines?week=${toISODate(date)}` : '/routines';
  }

  function goto(date: Date | null) {
    startTransition(() => {
      router.push(buildUrl(date));
    });
  }

  // Hover/focus로 대상 주(week) URL의 RSC payload를 warm-up.
  function prefetch(date: Date | null) {
    router.prefetch(buildUrl(date));
  }

  const todayMon = mondayOf(new Date());
  const isThisWeek = toISODate(week.monday) === toISODate(todayMon);

  return (
    <>
      {/* 모바일(rally-mobile-routines): [‹] 가운데 범위 [이번 주?] [›] — [이번 주]는 다른 주를 볼 때만 */}
      <div className="flex w-full items-center gap-1.5 md:hidden">
        <button
          type="button"
          onClick={() => goto(addDays(week.monday, -7))}
          className={MOBILE_NAV_BTN}
          aria-label="이전 주"
        >
          <span className={MOBILE_NAV_BOX}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </span>
        </button>
        <span className="flex-1 text-center text-[14.5px] font-semibold">{formatRange(week)}</span>
        {!isThisWeek ? (
          <button
            type="button"
            onClick={() => goto(null)}
            className="inline-flex h-9 cursor-pointer items-center rounded-md border border-btn-border bg-btn-bg px-3 text-[13px] font-medium text-btn-fg"
          >
            이번 주
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => goto(addDays(week.monday, 7))}
          className={MOBILE_NAV_BTN}
          aria-label="다음 주"
        >
          <span className={MOBILE_NAV_BOX}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        </button>
      </div>
    <div className="flex flex-wrap items-center gap-1.5 max-md:hidden">
      <span className="mr-2.5 text-[15px] font-semibold">{formatRange(week)}</span>
      <button
        type="button"
        onClick={() => goto(addDays(week.monday, -7))}
        onMouseEnter={() => prefetch(addDays(week.monday, -7))}
        onFocus={() => prefetch(addDays(week.monday, -7))}
        className={`${NAV_BTN} w-11 md:w-10`}
        aria-label="이전 주"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => goto(null)}
        onMouseEnter={() => prefetch(null)}
        onFocus={() => prefetch(null)}
        disabled={isThisWeek}
        className={`${NAV_BTN} px-3.5 text-sm font-medium text-btn-fg disabled:cursor-default disabled:border-divider disabled:text-ink-faint`}
      >
        이번 주
      </button>
      <button
        type="button"
        onClick={() => goto(addDays(week.monday, 7))}
        onMouseEnter={() => prefetch(addDays(week.monday, 7))}
        onFocus={() => prefetch(addDays(week.monday, 7))}
        className={`${NAV_BTN} w-11 md:w-10`}
        aria-label="다음 주"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
    </>
  );
}
