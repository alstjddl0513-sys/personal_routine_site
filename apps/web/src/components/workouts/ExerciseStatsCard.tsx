import type { Exercise, ExerciseStats } from '@repo/shared';
import { muscleLabel } from '../../lib/muscle-groups';
import { ExerciseSparkline } from './stats/ExerciseSparkline';

interface Props {
  exercise: Exercise;
  stats: ExerciseStats;
}

const num = (s: string) => Number(s);
// 'YYYY-MM-DD' → '11월 9일'
const monthDay = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;

// 종목 카드 — 최고 기록(전체 기간) + 최근 N번 운동한 날의 그날 최고 무게 꺾은선.
// 무게 기록이 있는 종목만(없는 종목은 페이지 맨 아래 접기 목록으로).
export function ExerciseStatsCard({ exercise, stats }: Props) {
  // 서비스는 최근 순 → 그래프는 오래된 순
  const history = stats.history.slice().reverse();
  const latest = stats.history[0];
  const count = history.length;
  const pr = stats.pr;

  return (
    <article className="flex min-w-0 flex-col gap-2.5 rounded-lg border border-line bg-surface px-4.5 pt-4 pb-3.5">
      <div className="min-w-0">
        <h4 className="truncate text-[17px] font-bold text-heading">{exercise.name}</h4>
        <p className="text-[13px] text-ink-muted">
          {muscleLabel(exercise.targetMuscle) ?? '기타'} · 목표 {exercise.repMin}~{exercise.repMax}회
        </p>
      </div>
      {pr ? (
        <p className="grid grid-cols-[56px_minmax(0,1fr)] gap-x-2 text-sm">
          <span className="whitespace-nowrap text-ink-muted">최고 기록</span>
          <span className="min-w-0 truncate">
            <span className="font-semibold text-ink-strong">
              {num(pr.weightKg)}kg{pr.reps != null ? ` × ${pr.reps}` : ''}
            </span>
            <span className="text-ink-muted"> · {monthDay(pr.sessionDate)}</span>
          </span>
        </p>
      ) : null}
      {latest ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-muted">
              최고 무게 · {count === 1 ? '기록 1번' : `최근 ${count}번`}
            </span>
            <span className="flex items-baseline gap-1.5 tabular-nums">
              <span className="text-[15px] font-bold text-ink">{num(latest.topWeightKg)}kg</span>
              <span className="text-xs text-ink-muted">{monthDay(latest.sessionDate)}</span>
            </span>
          </div>
          <ExerciseSparkline values={history.map((h) => num(h.topWeightKg))} />
        </div>
      ) : null}
    </article>
  );
}
