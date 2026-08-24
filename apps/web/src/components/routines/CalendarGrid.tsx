import Link from 'next/link';
import type { TimeBlock } from '@repo/shared';
import { mondayOf, toISODate, type MonthInfo } from '../../lib/routines-week';

interface Props {
  month: MonthInfo;
  // Includes archived blocks so past cells can be reconstructed accurately.
  blocks: TimeBlock[];
  checkCountsByDate: Map<string, number>;
}

const DOW_HEADER = ['월', '화', '수', '목', '금', '토', '일'];

// Day of archival still counts — the block was live at least part of it.
function activeCountOn(blocks: TimeBlock[], dateIso: string): number {
  return blocks.filter((b) => {
    const created = b.createdAt.slice(0, 10);
    if (created > dateIso) return false;
    if (b.archivedAt) {
      const archived = b.archivedAt.slice(0, 10);
      if (archived < dateIso) return false;
    }
    return true;
  }).length;
}

export function CalendarGrid({ month, blocks, checkCountsByDate }: Props) {
  const todayIso = toISODate(new Date());

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-zinc-500">
        {DOW_HEADER.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {month.gridDays.map((d) => {
          const iso = toISODate(d);
          const dayNum = d.getDate();
          const inMonth = d.getMonth() + 1 === month.month;
          const isToday = iso === todayIso;
          const total = activeCountOn(blocks, iso);
          const done = checkCountsByDate.get(iso) ?? 0;
          const ratio = total === 0 ? 0 : done / total;
          const barPct = Math.round(ratio * 100);
          const weekMonIso = toISODate(mondayOf(d));

          return (
            <Link
              key={iso}
              href={`/routines?week=${weekMonIso}`}
              className={`group flex min-h-16 flex-col rounded border p-1.5 text-left transition-colors ${
                inMonth
                  ? 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900'
                  : 'border-zinc-100 bg-zinc-50/50 text-zinc-400 hover:bg-zinc-100 dark:border-zinc-900 dark:bg-zinc-900/40 dark:text-zinc-600 dark:hover:bg-zinc-900'
              } ${isToday ? 'ring-1 ring-zinc-500 dark:ring-zinc-400' : ''}`}
              title={`${iso} · ${done}/${total}`}
            >
              <div
                className={`text-[11px] tabular-nums ${
                  inMonth
                    ? 'text-zinc-700 dark:text-zinc-300'
                    : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {dayNum}
              </div>
              {total > 0 && inMonth && (
                <div className="mt-auto flex flex-col gap-0.5">
                  <div className="h-1 w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                  <div className="text-[10px] tabular-nums text-zinc-500">
                    {done}/{total}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
