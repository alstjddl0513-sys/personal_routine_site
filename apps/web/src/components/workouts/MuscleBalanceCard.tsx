import type { MuscleVolumeEntry } from '@repo/shared';
import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';

interface Props {
  entries: MuscleVolumeEntry[];
  /** Range label shown in header (e.g. '최근 4주'). */
  rangeLabel: string;
}

function fmtKg(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// Horizontal bar per muscle. Upper body = emerald, lower = amber. Order
// follows MUSCLE_OPTIONS (upper first, then lower) so imbalance reads
// at a glance regardless of which muscles have data. Unknown/custom
// target_muscle values group under '기타'.
export function MuscleBalanceCard({ entries, rangeLabel }: Props) {
  // Aggregate server rows by lowercase key so 'BACK' / 'back' merge, and
  // custom values fall through to 'other' bucket.
  const byKey = new Map<string, number>();
  for (const e of entries) {
    const key = e.targetMuscle?.trim().toLowerCase() ?? '__other';
    byKey.set(key, (byKey.get(key) ?? 0) + e.volumeKg);
  }

  const knownBars = MUSCLE_OPTIONS.map((opt) => ({
    key: opt.key,
    label: opt.label,
    group: opt.group,
    volume: byKey.get(opt.key) ?? 0,
  }));

  // Anything not in MUSCLE_OPTIONS ends up in a single '기타' bar.
  const knownKeys = new Set(MUSCLE_OPTIONS.map((o) => o.key));
  let otherVolume = 0;
  for (const [key, vol] of byKey) {
    if (!knownKeys.has(key)) otherVolume += vol;
  }
  const bars = otherVolume > 0
    ? [...knownBars, { key: '__other', label: '기타', group: 'other' as const, volume: otherVolume }]
    : knownBars;

  const max = Math.max(...bars.map((b) => b.volume), 1);
  const totalVolume = bars.reduce((sum, b) => sum + b.volume, 0);
  const isEmpty = totalVolume === 0;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          부위별 볼륨
        </h2>
        <span className="text-[10px] text-zinc-500">{rangeLabel}</span>
      </div>

      {isEmpty ? (
        <p className="py-4 text-center text-xs text-zinc-500 dark:text-zinc-500">
          {rangeLabel}에 기록된 완전 세트가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {bars.map((b) => {
            const pct = (b.volume / max) * 100;
            const shareOfTotal =
              totalVolume > 0 ? Math.round((b.volume / totalVolume) * 100) : 0;
            const barColor =
              b.group === 'upper'
                ? 'bg-emerald-500'
                : b.group === 'lower'
                  ? 'bg-amber-500'
                  : 'bg-zinc-400 dark:bg-zinc-600';
            const trackColor = 'bg-zinc-100 dark:bg-zinc-800';
            return (
              <div
                key={b.key}
                className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 text-xs md:grid-cols-[3.5rem_1fr_7rem]"
              >
                <span className="text-zinc-600 dark:text-zinc-400">{b.label}</span>
                <div className={`relative h-3 overflow-hidden rounded-full ${trackColor}`}>
                  <div
                    className={`h-full rounded-full transition-[width] ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {fmtKg(b.volume)} <span className="text-zinc-400">kg</span>
                  <span className="ml-1 text-[10px] text-zinc-400">
                    ({shareOfTotal}%)
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
