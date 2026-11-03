'use client';

import { StickyNote } from 'lucide-react';
import {
  COMPANY_EVENT_TYPE_LABELS,
  type SchedulerEvent,
} from '@repo/shared';
import { EVENT_TONE } from './event-tone';

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  /** 알림·링크로 이 날짜를 지정해 들어왔을 때 한 번 깜빡임 */
  flash?: boolean;
  events: SchedulerEvent[];
  onClick: (iso: string) => void;
}

const MAX_LINES = 2;

// 셀 하나. 날짜 숫자 + 메모 아이콘 / 일정 "유형 점 + 회사명" 최대 2줄 + "+N건".
// 상태는 표시 위치가 안 겹침: 오늘 = 숫자 원, 선택 = 배경·안쪽 테두리,
// 깜빡임 = ::after 오버레이(globals.css .date-flash).
export function CalendarCell({
  date,
  iso,
  inMonth,
  isToday,
  isSelected,
  flash,
  events,
  onClick,
}: Props) {
  const dayNum = date.getDate();
  const weekend = date.getDay() === 0 || date.getDay() === 6;

  const jobs = events.filter(
    (e): e is Extract<SchedulerEvent, { kind: 'job' }> => e.kind === 'job',
  );
  const memo = events.some((e) => e.kind === 'memo');

  const visibleJobs = jobs.slice(0, MAX_LINES);
  const overflowCount = Math.max(0, jobs.length - MAX_LINES);

  const label = [
    `${date.getMonth() + 1}월 ${dayNum}일`,
    isToday ? '오늘' : null,
    jobs.length > 0 ? `일정 ${jobs.length}건` : null,
    memo ? '메모 있음' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <button
      type="button"
      onClick={() => onClick(iso)}
      aria-pressed={isSelected}
      aria-label={label}
      className={`relative flex min-h-16 cursor-pointer flex-col gap-1 px-1 pt-1.5 pb-2 text-left md:min-h-27 md:px-2 ${
        isSelected
          ? 'bg-chip-on-bg shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
          : inMonth
            ? 'bg-surface hover:bg-row-hover'
            : 'bg-cell-outside hover:bg-row-hover'
      } ${flash ? 'date-flash' : ''}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span
          className={`inline-flex h-6.5 items-center text-sm tabular-nums ${
            isToday
              ? 'w-6.5 justify-center rounded-full bg-button text-[13px] font-bold text-white'
              : `${isSelected ? 'font-bold' : 'font-medium'} ${
                  !inMonth ? 'text-icon-faint' : weekend ? 'text-ink-muted' : 'text-ink'
                }`
          }`}
        >
          {dayNum}
        </span>
        {memo ? (
          <StickyNote
            className="mt-1 h-3.25 w-3.25 shrink-0 text-ink-muted"
            strokeWidth={2}
            aria-hidden
          />
        ) : null}
      </div>

      {visibleJobs.length > 0 ? (
        <ul className={`flex min-w-0 flex-col gap-0.5 ${inMonth ? '' : 'opacity-55'}`}>
          {visibleJobs.map((e, idx) => (
            <li
              key={`${e.companyId}-${e.type}-${idx}`}
              title={`${COMPANY_EVENT_TYPE_LABELS[e.type]} · ${e.companyName}`}
              className="flex min-w-0 items-center gap-1.25 text-[10px] leading-[1.35] text-ink-soft md:text-xs"
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVENT_TONE[e.type][1]}`}
              />
              <span className="truncate">{e.companyName}</span>
            </li>
          ))}
          {overflowCount > 0 ? (
            <li className="text-[10px] leading-[1.35] text-ink-muted md:text-xs">
              +{overflowCount}건
            </li>
          ) : null}
        </ul>
      ) : null}
    </button>
  );
}
