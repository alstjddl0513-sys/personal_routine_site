'use client';

import { COMPANY_EVENT_TYPE_LABELS, type SchedulerEvent } from '@repo/shared';
import { toISODate, type MonthInfo } from '../../lib/routines-week';
import { CalendarCell } from './CalendarCell';
import { EVENT_TONE, EVENT_TYPES } from './event-tone';

interface Props {
  month: MonthInfo;
  todayIso: string;
  selectedIso: string | null;
  /** 진입 시 강조할 날짜 (알림·링크의 ?date=) */
  flashIso?: string | null;
  eventsByDate: Map<string, SchedulerEvent[]>;
  onSelect: (iso: string) => void;
}

const DOW_HEADER = ['월', '화', '수', '목', '금', '토', '일'];

// 월 그리드 (6×7). 요일 헤더 + 42개 셀 — 칸 사이 1px 선은 gap-px로 바탕색이
// 비치는 방식. 아래 유형 점 범례 한 줄 (메모 아이콘은 모양으로 알 수 있어 뺌).
export function CalendarGrid({
  month,
  todayIso,
  selectedIso,
  flashIso,
  eventsByDate,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="overflow-hidden rounded-lg border border-line bg-divider">
        <div className="grid grid-cols-7 gap-px">
          {DOW_HEADER.map((d, i) => (
            <div
              key={d}
              className={`bg-thead px-2.5 py-2 text-[13px] font-semibold ${
                i >= 5 ? 'text-ink-muted' : 'text-ink-soft'
              }`}
            >
              {d}
            </div>
          ))}
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
                flash={iso === flashIso}
                events={eventsByDate.get(iso) ?? []}
                onClick={onSelect}
              />
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-ink-muted">
        {EVENT_TYPES.map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span aria-hidden className={`h-1.75 w-1.75 rounded-full ${EVENT_TONE[t][1]}`} />
            {COMPANY_EVENT_TYPE_LABELS[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
