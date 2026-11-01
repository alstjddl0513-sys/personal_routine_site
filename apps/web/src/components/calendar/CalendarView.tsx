'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { SchedulerEvent } from '@repo/shared';
import type { MonthInfo } from '../../lib/routines-week';
import { CalendarDayPanel } from './CalendarDayPanel';
import { CalendarGrid } from './CalendarGrid';
import { MonthNav } from './MonthNav';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  const searchParams = useSearchParams();
  const [selectedIso, setSelectedIso] = useState<string | null>(
    initialSelectedIso,
  );
  // 깜빡일 날짜 + 재생 횟수. n을 그리드 key로 써서 같은 날짜도 다시 재생.
  const [flash, setFlash] = useState({ iso: initialSelectedIso, n: 0 });

  // ?date= 변화 감지. 셀 클릭은 replaceState로 URL과 선택이 같이 바뀌어
  // 걸리지 않고, 알림·월 이동처럼 밖에서 바뀐 경우만 선택을 따라감
  // (replaceState도 useSearchParams에 반영됨 — Next 라우터 연동).
  const rawUrlDate = searchParams.get('date');
  const urlDate =
    rawUrlDate && ISO_DATE_RE.test(rawUrlDate) ? rawUrlDate : null;
  const [seenUrlDate, setSeenUrlDate] = useState(urlDate);
  if (urlDate !== seenUrlDate) {
    setSeenUrlDate(urlDate);
    if (urlDate !== selectedIso) {
      setSelectedIso(urlDate);
      if (urlDate) setFlash((f) => ({ iso: urlDate, n: f.n + 1 }));
    }
  }

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
            // 밖에서 지정된 날짜만 깜빡임 — 셀 클릭으로 바꾼 선택엔 안 함.
            key={flash.n}
            month={month}
            todayIso={todayIso}
            selectedIso={selectedIso}
            flashIso={flash.iso}
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
