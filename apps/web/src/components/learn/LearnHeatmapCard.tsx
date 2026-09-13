import type { QuestionHeatmapEntry } from '@repo/shared';
import { addDays, mondayOf, toISODate } from '../../lib/routines-week';

interface Props {
  entries: QuestionHeatmapEntry[];
  today: Date;
  weeks?: number;
}

function buildGrid(today: Date, weeks: number): Date[][] {
  const currentMonday = mondayOf(today);
  const startMonday = addDays(currentMonday, -(weeks - 1) * 7);
  const cols: Date[][] = [];
  for (let w = 0; w < weeks; w++) {
    const colMon = addDays(startMonday, w * 7);
    const rows: Date[] = [];
    for (let r = 0; r < 7; r++) rows.push(addDays(colMon, r));
    cols.push(rows);
  }
  return cols;
}

const DOW_ROWS = ['월', '', '수', '', '금', '', '일'];

// Absolute count buckets (no denominator like workouts' totalExercises):
//   0    → empty
//   1-2  → light
//   3+   → dark
export function LearnHeatmapCard({ entries, today, weeks = 12 }: Props) {
  const grid = buildGrid(today, weeks);
  const byDate = new Map(entries.map((e) => [e.date, e.count]));
  const todayIso = toISODate(today);
  const activeDays = entries.filter((e) => e.count > 0).length;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          최근 학습
        </h2>
        <span className="text-[10px] text-zinc-500">
          {activeDays}일 학습 (최근 {weeks}주)
        </span>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex flex-col justify-between py-0.5 text-[9px] text-zinc-400">
          {DOW_ROWS.map((d, i) => (
            <span key={i} className="h-3 leading-3">
              {d}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {grid.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((d) => {
                const iso = toISODate(d);
                const count = byDate.get(iso) ?? 0;
                const isFuture = iso > todayIso;
                const isToday = iso === todayIso;
                let colorClass: string;
                if (isFuture) colorClass = 'bg-transparent';
                else if (count === 0) colorClass = 'bg-zinc-100 dark:bg-zinc-800';
                else if (count >= 3) colorClass = 'bg-emerald-500';
                else colorClass = 'bg-emerald-200 dark:bg-emerald-900';
                const title = count > 0 ? `${iso} · ${count}문제` : iso;
                return (
                  <div
                    key={iso}
                    title={title}
                    className={`h-3 w-3 rounded-[2px] ${colorClass} ${
                      isToday ? 'ring-1 ring-zinc-400 dark:ring-zinc-500' : ''
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
