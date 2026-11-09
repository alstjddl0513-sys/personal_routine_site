import Link from 'next/link';
import type { WorkoutDaySummary } from '@repo/shared';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

// 'YYYY-MM-DD' → '11월 6일 (목)'
function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAY[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

// 이번 주(월~일) 운동한 날 / 목표 일수. 다 채우면 메리골드(목표를 다 채운 막대 규칙).
// 디자인 개편 전 — 모양은 zinc 그대로, 숫자 기준만 확정.
export function WorkoutWeekDaysCard({
  days,
  weekFrom,
  weekTo,
  target,
}: {
  days: WorkoutDaySummary[];
  weekFrom: string;
  weekTo: string;
  target: number;
}) {
  const done = days.filter((d) => d.date >= weekFrom && d.date <= weekTo).length;
  const pct = Math.min(100, Math.round((done / target) * 100));
  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <span
        className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
        title="세트를 1개 이상 적은 날만 세요"
      >
        이번 주 운동한 날
      </span>
      <span className="text-sm tabular-nums text-zinc-800 dark:text-zinc-200">
        <span className="font-semibold">{done}</span> / {target}일
      </span>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full ${done >= target ? 'bg-marigold' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// 최근 운동한 날 — 그날 분할 이름 · 종목 수 · 세트 수. 누르면 그날 운동 기록으로.
export function RecentWorkoutDays({ days }: { days: WorkoutDaySummary[] }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">최근 운동한 날</h2>
      {days.length === 0 ? (
        <p className="py-4 text-center text-sm text-zinc-500">아직 운동 기록이 없어요.</p>
      ) : (
        <ul className="flex flex-col">
          {days.map((d) => (
            <li key={d.date}>
              <Link
                href={`/workouts?date=${d.date}`}
                className="flex min-h-10 items-center gap-2 rounded px-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                <span className="font-medium tabular-nums">{fmtDay(d.date)}</span>
                {d.splitNames.length > 0 ? (
                  <span className="text-zinc-700 dark:text-zinc-300">· {d.splitNames.join(' · ')}</span>
                ) : null}
                <span className="ml-auto tabular-nums text-zinc-500">
                  {d.exerciseCount}종목 {d.setCount}세트
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
