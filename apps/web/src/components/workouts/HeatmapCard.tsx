import { addDays, mondayOf, toISODate } from '../../lib/routines-week';

interface Props {
  sessionDates: string[];
  today: Date;
  weeks?: number;
}

// Build a `weeks × 7` grid ending at today's week (Sunday), each cell a Date.
// weeks[0] is the oldest column so cells flow left→right as time progresses.
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

export function HeatmapCard({ sessionDates, today, weeks = 12 }: Props) {
  const grid = buildGrid(today, weeks);
  const filled = new Set(sessionDates);
  const todayIso = toISODate(today);

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          최근 기록
        </h2>
        <span className="text-[10px] text-zinc-500">
          {sessionDates.length}일 운동 (최근 {weeks}주)
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
                const has = filled.has(iso);
                const isFuture = iso > todayIso;
                const isToday = iso === todayIso;
                return (
                  <div
                    key={iso}
                    title={`${iso}${has ? ' · 운동' : ''}`}
                    className={`h-3 w-3 rounded-[2px] ${
                      isFuture
                        ? 'bg-transparent'
                        : has
                          ? 'bg-emerald-500'
                          : 'bg-zinc-100 dark:bg-zinc-800'
                    } ${isToday ? 'ring-1 ring-zinc-400 dark:ring-zinc-500' : ''}`}
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
