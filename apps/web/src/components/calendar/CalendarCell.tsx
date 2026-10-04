'use client';

import {
  COMPANY_EVENT_TYPE_LABELS,
  type SchedulerEvent,
} from '@repo/shared';

interface Props {
  date: Date;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  events: SchedulerEvent[];
  onClick: (iso: string) => void;
}

// 셀 하나. 날짜 숫자 + 이벤트 뱃지(최대 2개 + "+N") + 메모 indicator.
// job 이벤트는 subtype별 색, 메모는 중립 톤.
export function CalendarCell({
  date,
  iso,
  inMonth,
  isToday,
  isSelected,
  events,
  onClick,
}: Props) {
  const dayNum = date.getDate();

  // job 이벤트와 memo 이벤트 분리.
  const jobs = events.filter((e) => e.kind === 'job');
  const memo = events.find((e) => e.kind === 'memo');

  // 이벤트 표시: 최대 2개 뱃지 + 넘치면 "+N"
  const MAX_BADGES = 2;
  const visibleJobs = jobs.slice(0, MAX_BADGES);
  const overflowCount = Math.max(0, jobs.length - MAX_BADGES);

  return (
    <button
      type="button"
      onClick={() => onClick(iso)}
      aria-pressed={isSelected}
      aria-label={`${iso} 선택 (이벤트 ${jobs.length}개${memo ? ', 메모 있음' : ''})`}
      className={`group relative flex min-h-20 flex-col gap-0.5 rounded-md border p-1.5 text-left transition-colors ${
        inMonth
          ? isSelected
            ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
            : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900'
          : 'border-zinc-100 bg-zinc-50/40 text-zinc-400 hover:bg-zinc-100 dark:border-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-600 dark:hover:bg-zinc-900'
      } ${isToday ? 'ring-1 ring-emerald-500 dark:ring-emerald-400' : ''}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`text-xs tabular-nums ${
            inMonth
              ? isToday
                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                : 'text-zinc-700 dark:text-zinc-300'
              : 'text-zinc-400 dark:text-zinc-600'
          }`}
        >
          {dayNum}
        </span>
        {memo ? (
          <span
            aria-hidden
            title="메모"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 dark:bg-amber-500"
          />
        ) : null}
      </div>

      {inMonth && visibleJobs.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {visibleJobs.map((e, idx) => {
            if (e.kind !== 'job') return null;
            return (
              <li
                key={`${e.companyId}-${e.type}-${idx}`}
                className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${jobBadgeClass(e.type)}`}
                title={`${COMPANY_EVENT_TYPE_LABELS[e.type]} · ${e.companyName}${e.note ? ` · ${e.note}` : ''}`}
              >
                {e.companyName}
              </li>
            );
          })}
          {overflowCount > 0 ? (
            <li className="rounded bg-zinc-100 px-1 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              +{overflowCount}개
            </li>
          ) : null}
        </ul>
      ) : null}
    </button>
  );
}

// Job 이벤트 subtype별 색 — 톤 통일 (가독성 위주, 축제 색감은 피함).
function jobBadgeClass(type: string): string {
  switch (type) {
    case 'deadline':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
    case 'test':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300';
    case 'interview':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300';
    case 'announcement':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300';
    default:
      return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';
  }
}
