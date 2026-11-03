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

const NAV_ICON_BTN =
  'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-btn-border bg-btn-bg text-ink-soft hover:border-heading';

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
        className={NAV_ICON_BTN}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <h2 className="min-w-33 text-center text-lg font-semibold">
        {month.year}년 {month.month}월
      </h2>
      <button
        type="button"
        onClick={() => goto(nextMonth(month.year, month.month))}
        aria-label="다음 달"
        className={NAV_ICON_BTN}
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => goto(null)}
        className="ml-1.5 inline-flex h-10 cursor-pointer items-center rounded-md border border-btn-border bg-btn-bg px-3.5 text-sm font-medium text-btn-fg hover:border-heading"
      >
        오늘
      </button>
    </div>
  );
}
