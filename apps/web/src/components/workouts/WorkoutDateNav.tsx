'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, dowLabel, toISODate } from '../../lib/routines-week';

export function WorkoutDateNav({ date }: { date: Date }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function goto(next: Date | null) {
    startTransition(() => {
      if (!next) router.push('/workouts');
      else router.push(`/workouts?date=${toISODate(next)}`);
    });
  }

  const todayIso = toISODate(new Date());
  const isToday = toISODate(date) === todayIso;

  const label = `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')} (${dowLabel(date)})`;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => goto(addDays(date, -1))}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="이전 날짜"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => goto(null)}
        disabled={isToday}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:cursor-default disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        오늘
      </button>
      <button
        type="button"
        onClick={() => goto(addDays(date, 1))}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label="다음 날짜"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
      <span className="ml-2 text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
        {label}
      </span>
    </div>
  );
}
