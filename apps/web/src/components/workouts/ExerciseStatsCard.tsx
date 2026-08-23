import type { Exercise, ExerciseStats } from '@repo/shared';
import { MiniLineChart } from './MiniLineChart';

interface Props {
  exercise: Exercise;
  stats: ExerciseStats;
}

function formatPR(pr: ExerciseStats['pr']): string {
  if (!pr) return '기록 없음';
  const w = Number(pr.weightKg);
  const parts = pr.reps != null ? `${w}kg × ${pr.reps}` : `${w}kg`;
  return `${parts} (${pr.sessionDate})`;
}

export function ExerciseStatsCard({ exercise, stats }: Props) {
  // history from service: most recent first. Chart needs oldest → newest.
  const chartPoints = stats.history
    .slice()
    .reverse()
    .map((h) => ({ date: h.sessionDate, value: Number(h.topWeightKg) }));

  const latest = stats.history[0];
  const oldest = stats.history[stats.history.length - 1];

  const showChart = chartPoints.length > 0;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{exercise.name}</div>
          <div className="text-[11px] text-zinc-500">
            {exercise.targetMuscle ?? '-'} · 목표 {exercise.repMin}~{exercise.repMax}회
          </div>
        </div>
        <div className="shrink-0 rounded bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="mr-1">PR</span>
          {formatPR(stats.pr)}
        </div>
      </div>

      {showChart ? (
        <>
          <MiniLineChart points={chartPoints} />
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <span>{oldest?.sessionDate}</span>
            <span>
              최근 {chartPoints.length}회 top set · 최신 {Number(latest.topWeightKg)}kg
              {latest.topReps != null ? ` × ${latest.topReps}` : ''}
            </span>
            <span>{latest?.sessionDate}</span>
          </div>
        </>
      ) : (
        <div className="rounded bg-zinc-50 px-2 py-6 text-center text-[11px] italic text-zinc-400 dark:bg-zinc-900">
          아직 무게 기록이 없습니다
        </div>
      )}
    </div>
  );
}
