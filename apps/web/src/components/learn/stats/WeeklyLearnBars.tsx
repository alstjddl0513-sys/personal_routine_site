import type { QuestionHeatmapEntry } from '@repo/shared';
import { addDays, mondayOf, toISODate } from '../../../lib/routines-week';

// 주별 학습량 — 주(월~일)마다 날짜별 학습한 질문 수의 합(히트맵 숫자를 주로 더함).
// 같은 질문을 다른 날 다시 보면 그날도 셈, 같은 날 여러 번은 1개. 이번 주는 진행 중이라 옅게.
// 디자인 개편 전 — 모양은 zinc, 숫자 기준만 확정.
export function WeeklyLearnBars({
  entries,
  today,
  weeks = 12,
}: {
  entries: QuestionHeatmapEntry[];
  today: Date;
  weeks?: number;
}) {
  const thisMonday = mondayOf(today);
  const sums = new Map<string, number>();
  for (const e of entries) {
    const [y, m, d] = e.date.split('-').map(Number);
    const key = toISODate(mondayOf(new Date(y, m - 1, d)));
    sums.set(key, (sums.get(key) ?? 0) + e.count);
  }
  const bars = Array.from({ length: weeks }, (_, i) => {
    const mon = toISODate(addDays(thisMonday, -(weeks - 1 - i) * 7));
    return { mon, count: sums.get(mon) ?? 0, current: i === weeks - 1 };
  });
  const max = Math.max(1, ...bars.map((b) => b.count));
  const md = (iso: string) => `${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">주별 학습량</h2>
        <span className="text-xs text-zinc-500">최근 {weeks}주 · 질문 수</span>
      </div>
      <div className="flex h-28 items-end gap-1.5">
        {bars.map((b) => (
          <div
            key={b.mon}
            title={`${b.current ? '이번 주' : `${md(b.mon)} 주`} · 질문 ${b.count}개`}
            className="flex h-full flex-1 flex-col justify-end"
          >
            <span
              className={`block w-full rounded-t-sm ${b.current ? 'bg-primary/40' : 'bg-primary'}`}
              style={{ height: b.count > 0 ? `${Math.max(4, (b.count / max) * 100)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-500">
        <span>{md(bars[0].mon)}</span>
        <span>{md(bars[Math.floor(weeks / 2)].mon)}</span>
        <span>이번 주</span>
      </div>
    </div>
  );
}
