'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { SchedulerEvent } from '@repo/shared';
import type { MonthInfo } from '../../lib/routines-week';
import { CalendarDayPanel } from './CalendarDayPanel';
import { CalendarGrid } from './CalendarGrid';
import { MonthNav } from './MonthNav';

interface Props {
  month: MonthInfo;
  todayIso: string;
  initialSelectedIso: string | null;
  eventsByDate: Map<string, SchedulerEvent[]>;
}

// 캘린더 뷰 전체. 월 네비 + 그리드 + (옵션) 날짜 패널.
// 선택 상태는 URL query ?date=YYYY-MM-DD로 반영 → 공유/뒤로가기 호환.
export function CalendarView({
  month,
  todayIso,
  initialSelectedIso,
  eventsByDate,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIso, setSelectedIso] = useState<string | null>(
    initialSelectedIso,
  );

  function updateDateInUrl(nextIso: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextIso) params.set('date', nextIso);
    else params.delete('date');
    const qs = params.toString();
    // replaceState로 history에 쌓지 않음 (셀 클릭마다 뒤로가기 포인트가 되면 번잡).
    window.history.replaceState(
      null,
      '',
      `/calendar${qs ? `?${qs}` : ''}`,
    );
  }

  function onSelect(iso: string) {
    // 같은 날 다시 누르면 닫기.
    const next = selectedIso === iso ? null : iso;
    setSelectedIso(next);
    updateDateInUrl(next);
  }

  function onClose() {
    setSelectedIso(null);
    updateDateInUrl(null);
  }

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">캘린더</h1>
        <MonthNav month={month} />
      </header>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="flex-1">
          <CalendarGrid
            month={month}
            todayIso={todayIso}
            selectedIso={selectedIso}
            eventsByDate={eventsByDate}
            onSelect={onSelect}
          />
        </div>
        {selectedIso ? (
          <div className="md:w-80 md:shrink-0">
            <CalendarDayPanel
              iso={selectedIso}
              events={eventsByDate.get(selectedIso) ?? []}
              onClose={onClose}
            />
          </div>
        ) : null}
      </div>
    </>
  );
}
