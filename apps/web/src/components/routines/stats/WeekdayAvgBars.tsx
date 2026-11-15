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

  // 가장 낮은 요일만 글자 굵게 — "어느 요일에 약한지"가 이 카드의 용도.
  // 동률이면 모두, 전부 0%면 강조 없음. 막대 색은 그대로(비교용 막대라 메리골드 X).
  const maxRate = Math.max(...rates);
  const minRate = Math.min(...rates);
  const hasLow = maxRate > 0;

  return (
    <section
      aria-labelledby="weekday-avg-title"
      className="flex flex-col rounded-lg border border-line bg-surface px-6 gap-3.5 pt-5.5 pb-5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="weekday-avg-title" className="text-[17px] font-bold text-heading">
          요일별 평균
        </h2>
        <span
          title={`최근 ${weeks}주 동안 그 요일마다 체크한 칸 ÷ (루틴 수 × 그 요일 수)`}
          className="text-[13px] text-ink-muted"
        >
          최근 {weeks}주
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {DOW_LABELS.map((label, idx) => {
          const rate = rates[idx];
          const low = hasLow && rate === minRate;
          const weekend = idx >= 5;
          return (
            <li
              key={label}
              className="grid grid-cols-[24px_minmax(0,1fr)_44px] items-center gap-3 text-sm"
            >
              <span
                className={
                  low ? 'font-bold text-ink-strong' : weekend ? 'text-ink-muted' : 'text-ink-soft'
                }
              >
                {label}
              </span>
              <span className="block h-1.5 bg-track">
                <span className="block h-full bg-primary" style={{ width: `${rate}%` }} />
              </span>
              <span className={`text-right ${low ? 'font-bold text-ink-strong' : 'text-ink-soft'}`}>
                {rate}%
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
