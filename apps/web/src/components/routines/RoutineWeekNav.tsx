'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addDays,
  formatWeekRange,
  mondayOf,
  toISODate,
  type WeekInfo,
} from '../../lib/routines-week';

export function RoutineWeekNav({ week }: { week: WeekInfo }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function goto(date: Date | null) {
    startTransition(() => {
      if (!date) router.push('/routines');
      else router.push(`/routines?week=${toISODate(date)}`);
    });
  }

  const todayMon = mondayOf(new Date());
  const isThisWeek = toISODate(week.monday) === toISODate(todayMon);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => goto(addDays(week.monday, -7))}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="이전 주"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => goto(null)}
        disabled={isThisWeek}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-default disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        이번 주
      </button>
      <button
        type="button"
        onClick={() => goto(addDays(week.monday, 7))}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="다음 주"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
      <span className="ml-2 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
        {formatWeekRange(week)}
      </span>
    </div>
  );
}
