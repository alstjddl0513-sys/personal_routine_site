'use client';

import type { SchedulerEvent } from '@repo/shared';
import { toISODate, type MonthInfo } from '../../lib/routines-week';
import { CalendarCell } from './CalendarCell';

interface Props {
  month: MonthInfo;
  todayIso: string;
  selectedIso: string | null;
  eventsByDate: Map<string, SchedulerEvent[]>;
  onSelect: (iso: string) => void;
}

const DOW_HEADER = ['월', '화', '수', '목', '금', '토', '일'];

// 월 그리드 (6×7). 요일 헤더 + 42개 셀.
export function CalendarGrid({
  month,
  todayIso,
  selectedIso,
  eventsByDate,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1 px-1 text-center text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
        {DOW_HEADER.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {month.gridDays.map((d) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() + 1 === month.month;
          return (
            <CalendarCell
              key={iso}
              date={d}
              iso={iso}
              inMonth={inMonth}
              isToday={iso === todayIso}
              isSelected={iso === selectedIso}
              events={eventsByDate.get(iso) ?? []}
              onClick={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
}
