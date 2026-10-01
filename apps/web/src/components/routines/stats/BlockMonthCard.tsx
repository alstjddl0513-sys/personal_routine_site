import type { RoutineCheck, TimeBlock } from '@repo/shared';
import {
  addDays,
  toISODate,
  type MonthInfo,
} from '../../../lib/routines-week';

interface Props {
  block: TimeBlock;
  month: MonthInfo;
  // 이 블록의 체크 중 month.gridFrom~gridTo 범위 안 것만 전달받음.
  checks: RoutineCheck[];
  today: Date;
}

// 블록 하나의 "이번달" 요약 카드:
// 상단: 라벨 + 달성률 % 뱃지
// 중앙: 요일 헤더 + 미니 월 격자 (체크/미체크/미래)
// 하단: 완료 일수 + 현재 연속일수 (있을 때만)
export function BlockMonthCard({ block, month, checks, today }: Props) {
  const todayIso = toISODate(today);
  const checkedSet = new Set(checks.map((c) => c.date));

  // 분모: 이번달 전체 일수 (10월이면 31). "진행률" 개념 — 월 지날수록 자연스럽게 증가.
  // 오늘까지만 세면 월 초에 1/1=100%가 되어 격자(1칸)와 숫자(100%)가 어긋남.
  const inMonthDates: string[] = [];
  for (const d of month.gridDays) {
    if (d.getMonth() + 1 !== month.month) continue;
    inMonthDates.push(toISODate(d));
  }
  const done = inMonthDates.filter((iso) => checkedSet.has(iso)).length;
  const rate = inMonthDates.length > 0
    ? Math.round((done / inMonthDates.length) * 100)
    : 0;

  // 현재 연속일수: 오늘부터 뒤로 가며 세기. 오늘 아직 체크 안 됐으면 어제부터.
  let streak = 0;
  let cursor = today;
  if (!checkedSet.has(toISODate(cursor))) {
    cursor = addDays(cursor, -1);
  }
  while (checkedSet.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const rateColor =
    rate >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : rate >= 50
        ? 'text-emerald-500 dark:text-emerald-400'
        : 'text-zinc-500 dark:text-zinc-400';

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <header className="flex items-start justify-between gap-2">
        <h3
          className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800 dark:text-zinc-200"
          title={block.label}
        >
          {block.label}
        </h3>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${rateColor}`}>
          {rate}%
        </span>
      </header>

      <div className="grid grid-cols-7 gap-0.5" aria-hidden>
        {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
          <div
            key={d}
            className="text-center text-[9px] text-zinc-400 dark:text-zinc-600"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {month.gridDays.map((d) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() + 1 === month.month;
          const isFuture = iso > todayIso;
          const isToday = iso === todayIso;
          const checked = checkedSet.has(iso);

          if (!inMonth) {
            return <div key={iso} className="h-4" aria-hidden />;
          }

          return (
            <div
              key={iso}
              title={`${iso} ${checked ? '완료' : isFuture ? '예정' : '미완료'}`}
              className={`h-4 rounded-sm ${
                checked
                  ? 'bg-emerald-500 dark:bg-emerald-400'
                  : isFuture
                    ? 'border border-dashed border-zinc-200 dark:border-zinc-700'
                    : 'bg-zinc-100 dark:bg-zinc-800'
              } ${isToday ? 'ring-1 ring-zinc-500 dark:ring-zinc-400' : ''}`}
            />
          );
        })}
      </div>

      <footer className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400">
        <span>
          <span className="tabular-nums">{done}</span>일 완료
        </span>
        {streak > 0 ? (
          <span>
            지금 <span className="tabular-nums">{streak}</span>일째
          </span>
        ) : (
          <span>&nbsp;</span>
        )}
      </footer>
    </article>
  );
}
