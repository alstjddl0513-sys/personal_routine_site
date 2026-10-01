import type { RoutineCheck } from '@repo/shared';
import { parseISODate } from '../../../lib/routines-week';

interface Props {
  checks: RoutineCheck[];
  blockCount: number;
  weeks: number; // lookback (예: 8)
}

const DOW_LABELS = ['월', '화', '수', '목', '금', '토', '일'];

// 최근 N주 요일별 평균 완료율. "나 토요일에 약하네" 자각용.
// weekday 0=Sun…6=Sat (JS 기본). 월요일 기준으로 재맵.
function jsDowToMonFirst(jsDow: number): number {
  return jsDow === 0 ? 6 : jsDow - 1;
}

export function WeekdayAvgBars({ checks, blockCount, weeks }: Props) {
  if (blockCount === 0 || weeks === 0) {
    return null;
  }
  // 요일별 체크 수 집계.
  const perWeekday = [0, 0, 0, 0, 0, 0, 0];
  for (const c of checks) {
    const d = parseISODate(c.date);
    if (!d) continue;
    perWeekday[jsDowToMonFirst(d.getDay())] += 1;
  }
  // 분모: blockCount × weeks (각 요일당 가능한 체크 수).
  const possiblePerDay = blockCount * weeks;
  const rates = perWeekday.map((n) =>
    possiblePerDay > 0 ? Math.round((n / possiblePerDay) * 100) : 0,
  );

  return (
    <section
      aria-label={`최근 ${weeks}주 요일별 평균 완료율`}
      className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          요일별 평균 완료율
        </h2>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          최근 {weeks}주
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {DOW_LABELS.map((label, idx) => {
          const rate = rates[idx];
          return (
            <li key={label} className="flex items-center gap-3 text-xs">
              <span className="w-6 shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
                {label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className={`h-full rounded-full ${
                    rate >= 80
                      ? 'bg-emerald-500'
                      : rate >= 50
                        ? 'bg-emerald-400'
                        : rate > 0
                          ? 'bg-emerald-300'
                          : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                  style={{ width: `${rate}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums text-zinc-500 dark:text-zinc-400">
                {rate}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
