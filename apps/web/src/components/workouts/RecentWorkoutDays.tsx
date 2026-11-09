import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { WorkoutDaySummary } from '@repo/shared';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

// 'YYYY-MM-DD' → '11월 6일 (목)'
function fmtDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const wd = WEEKDAY[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${wd})`;
}

// 최근 운동한 날 — 줄 전체가 그날 운동 기록으로 가는 링크.
// 분할을 쓰는 사람: 분할 없이 기록한 날은 가운데 칸만 비움. 분할을 안 쓰는 사람: 가운데 칸 자체가 없음.
export function RecentWorkoutDays({
  days,
  showSplit,
}: {
  days: WorkoutDaySummary[];
  /** 분할이 1개 이상 있으면 true */
  showSplit: boolean;
}) {
  return (
    <section
      aria-labelledby="recent-days-title"
      className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-line bg-surface px-6 pt-5.5 pb-5"
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h2 id="recent-days-title" className="text-[17px] font-bold text-heading">
          최근 운동한 날
        </h2>
        {days.length > 0 ? <span className="text-[13px] text-ink-muted">{days.length}일</span> : null}
      </div>
      {days.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-8 text-center">
          <p className="text-ink-soft">아직 운동한 날이 없어요.</p>
          <Link href="/workouts" className="inline-flex min-h-10 items-center text-sm text-heading hover:underline">
            오늘 운동 기록하기 ›
          </Link>
        </div>
      ) : (
        <ul className="-mt-1.5">
          {days.map((d) => (
            <li key={d.date} className="border-b border-divider last:border-b-0">
              <Link
                href={`/workouts?date=${d.date}`}
                className="group -mx-2.5 flex min-h-11 items-center gap-3.5 rounded-md px-2.5 text-sm text-ink hover:bg-row-hover"
              >
                <span className="w-28 shrink-0 font-medium tabular-nums group-hover:font-semibold">
                  {fmtDay(d.date)}
                </span>
                {showSplit ? (
                  <span className="min-w-0 flex-1 truncate text-ink-soft">{d.splitNames.join(' · ')}</span>
                ) : null}
                <span className={`shrink-0 text-ink-muted tabular-nums ${showSplit ? '' : 'flex-1'}`}>
                  {d.exerciseCount}종목 {d.setCount}세트
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-ink-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
