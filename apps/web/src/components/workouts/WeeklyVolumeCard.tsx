import type { WeeklyVolumeEntry } from '@repo/shared';
import { addDays, mondayOf, toISODate } from '../../lib/routines-week';
import { MiniLineChart } from './MiniLineChart';

interface Props {
  entries: WeeklyVolumeEntry[];
  today: Date;
  weeks?: number;
}

// Format like "3,240" so users read big kg totals easily. Rounds to int.
function fmtKg(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// 'YYYY-MM-DD' → 'M/D'. Compact for the x-axis anchor labels.
function fmtMD(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
}

// Pick 4 evenly-spaced anchor indices — first, ~1/3, ~2/3, last.
// Dedupes for tiny series (weeks < 4).
function anchorIndices(count: number): number[] {
  if (count <= 1) return [0];
  if (count <= 4) return Array.from({ length: count }, (_, i) => i);
  const raw = [
    0,
    Math.round((count - 1) / 3),
    Math.round(((count - 1) * 2) / 3),
    count - 1,
  ];
  return Array.from(new Set(raw)).sort((a, b) => a - b);
}

export function WeeklyVolumeCard({ entries, today, weeks = 12 }: Props) {
  // Build the chronological weeks the chart will render. Filling missing
  // weeks with 0 keeps valleys visible instead of the line jumping over
  // gaps.
  const thisMonday = mondayOf(today);
  const points: { date: string; value: number }[] = [];
  const byWeek = new Map(entries.map((e) => [e.weekStart, e.volumeKg]));
  for (let i = weeks - 1; i >= 0; i--) {
    const mon = addDays(thisMonday, -i * 7);
    const iso = toISODate(mon);
    points.push({ date: iso, value: byWeek.get(iso) ?? 0 });
  }

  const thisWeekIso = toISODate(thisMonday);
  const lastWeekIso = toISODate(addDays(thisMonday, -7));
  const thisWeek = byWeek.get(thisWeekIso) ?? 0;
  const lastWeek = byWeek.get(lastWeekIso) ?? 0;
  const delta = thisWeek - lastWeek;

  // Delta indicator: only meaningful when there's a comparable last week.
  // → hide it when both are 0 (no prior data).
  const hasComparison = thisWeek > 0 || lastWeek > 0;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            이번주 총 볼륨
          </span>
          <span className="mt-0.5 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {fmtKg(thisWeek)}
            <span className="ml-1 text-sm font-normal text-zinc-500">kg</span>
          </span>
        </div>
        {hasComparison ? (
          <span
            className={`text-xs ${
              delta > 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : delta < 0
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-zinc-500 dark:text-zinc-500'
            }`}
            title={`지난주: ${fmtKg(lastWeek)}kg`}
          >
            {delta === 0
              ? '지난주와 동일'
              : `${delta > 0 ? '+' : ''}${fmtKg(delta)}kg vs 지난주`}
          </span>
        ) : null}
      </div>
      <MiniLineChart
        points={points}
        height={96}
        strokeWidth={2}
        ariaLabel={`최근 ${weeks}주 주간 볼륨 추이`}
        unit="kg"
      />
      {/* Anchor date labels (월요일 기준). Absolute-positioned to align with
          approximate dot x-positions. Chart has ~6px inner padding but this
          is close enough visually; hover tooltip covers exact matching. */}
      <div className="relative mt-1 h-4">
        {anchorIndices(points.length).map((i) => (
          <span
            key={i}
            className="absolute -translate-x-1/2 text-[10px] text-zinc-500 dark:text-zinc-500"
            style={{ left: `${(i / (points.length - 1)) * 100}%` }}
          >
            {fmtMD(points[i].date)}
          </span>
        ))}
      </div>
    </div>
  );
}
