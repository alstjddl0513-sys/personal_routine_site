'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type MonthInfo } from '../../lib/routines-week';

function prevMonth(year: number, month: number): string {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function nextMonth(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function MonthNav({ month }: { month: MonthInfo }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goto(mm: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (mm) params.set('month', mm);
    else params.delete('month');
    // 월 전환 시 선택된 날짜도 리셋 (다른 달 날짜는 의미 없음).
    params.delete('date');
    const qs = params.toString();
    router.push(`/calendar${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => goto(prevMonth(month.year, month.month))}
        aria-label="이전 달"
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <span className="min-w-20 text-center text-sm font-medium tabular-nums text-zinc-700 dark:text-zinc-300">
        {month.year}년 {month.month}월
      </span>
      <button
        type="button"
        onClick={() => goto(nextMonth(month.year, month.month))}
        aria-label="다음 달"
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-zinc-200 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => goto(null)}
        className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
      >
        오늘
      </button>
    </div>
  );
}
