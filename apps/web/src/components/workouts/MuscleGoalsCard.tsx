import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import {
  DEFAULT_MUSCLE_GOALS,
  type MuscleGoal,
  type MuscleSetCountEntry,
} from '@repo/shared';
import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';

interface Props {
  goals: MuscleGoal[];
  entries: MuscleSetCountEntry[];
  /** Range label shown in header (e.g. '이번주'). */
  rangeLabel: string;
}

// 부위별 주간 세트 목표 대비 달성률. entries는 이번주(월~일) 완전 세트 카운트.
// goals가 없는 부위는 DEFAULT_MUSCLE_GOALS 값으로 폴백 — 신규/미설정 유저도 카드가
// 그럴싸하게 보임.
export function MuscleGoalsCard({ goals, entries, rangeLabel }: Props) {
  const goalByKey = new Map(goals.map((g) => [g.muscleKey, g.weeklySetTarget]));
  const defaultByKey = new Map(
    DEFAULT_MUSCLE_GOALS.map((d) => [d.muscleKey, d.weeklySetTarget]),
  );
  const countByKey = new Map<string, number>();
  for (const e of entries) {
    if (!e.muscleKey) continue;
    const key = e.muscleKey.trim().toLowerCase();
    countByKey.set(key, (countByKey.get(key) ?? 0) + e.setCount);
  }

  const rows = MUSCLE_OPTIONS.map((opt) => {
    const target = goalByKey.get(opt.key) ?? defaultByKey.get(opt.key) ?? 10;
    const done = countByKey.get(opt.key) ?? 0;
    const pct = target > 0 ? Math.round((done / target) * 100) : 0;
    return { key: opt.key, label: opt.label, target, done, pct };
  });

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            부위별 주간 목표
          </h2>
          <span className="text-[10px] text-zinc-500">{rangeLabel}</span>
        </div>
        <Link
          href="/settings/muscle-goals"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          목표 설정
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {rows.map((r) => {
          // Fill bar caps at 100%; overflow shows in the text ("120%").
          const fillPct = Math.min(r.pct, 100);
          const barColor = fillColor(r.pct);
          const trackColor = 'bg-zinc-100 dark:bg-zinc-800';
          return (
            <div
              key={r.key}
              className="grid grid-cols-[3rem_1fr_6rem] items-center gap-3 text-xs md:grid-cols-[3.5rem_1fr_8rem]"
            >
              <span className="text-zinc-600 dark:text-zinc-400">{r.label}</span>
              <div className={`relative h-3 overflow-hidden rounded-full ${trackColor}`}>
                <div
                  className={`h-full rounded-full transition-[width] ${barColor}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
              <span className="text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                {r.done} / {r.target}
                <span className={`ml-1 text-[10px] ${overflowColor(r.pct)}`}>
                  ({r.pct}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 달성률 톤 단일. 100%+ 진한, 50~99% 중간, <50% 옅음, 0% zinc.
function fillColor(pct: number): string {
  if (pct === 0) return 'bg-zinc-300 dark:bg-zinc-700';
  if (pct >= 100) return 'bg-emerald-600 dark:bg-emerald-500';
  if (pct >= 50) return 'bg-emerald-400 dark:bg-emerald-600';
  return 'bg-emerald-200 dark:bg-emerald-900';
}

function overflowColor(pct: number): string {
  return pct >= 100
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-zinc-400';
}
