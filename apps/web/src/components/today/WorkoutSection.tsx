import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getMuscleGoals, getMuscleSets } from '../../lib/api';
import { muscleLabel } from '../../lib/muscle-groups';
import { addDays, mondayOf, toISODate } from '../../lib/routines-week';
import { getToday, settle } from '../../lib/today-data';
import { CardMessage, LOAD_ERROR_COPY, ProgressBar, TodayCard } from './Card';

// 이번 주(월~일) 부위별 완전세트 vs 목표. /workouts/statistics의
// MuscleGoalsCard와 같은 소스(getMuscleSets = 완전세트만 집계).
export async function WorkoutSection() {
  const { today } = getToday();
  const monday = mondayOf(today);
  const [sets, goals] = await Promise.all([
    settle(
      getMuscleSets({ from: toISODate(monday), to: toISODate(addDays(monday, 6)) }),
    ),
    settle(getMuscleGoals()),
  ]);

  const countByKey = new Map((sets ?? []).map((s) => [s.muscleKey, s.setCount]));
  const rows = (goals ?? []).map((g) => {
    const done = countByKey.get(g.muscleKey) ?? 0;
    return {
      key: g.muscleKey,
      label: muscleLabel(g.muscleKey) ?? g.muscleKey,
      done,
      target: g.weeklySetTarget,
      pct: g.weeklySetTarget > 0 ? (done / g.weeklySetTarget) * 100 : 0,
    };
  });

  return (
    <TodayCard
      id="workout-title"
      title="이번 주 운동"
      className="flex-[1_1_320px]"
      aside={<span className="text-[13px] text-ink-muted">부위별 세트 목표</span>}
    >
      {sets === null || goals === null ? (
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      ) : rows.length === 0 ? (
        <CardMessage href="/settings/muscle-goals" linkLabel="목표 정하기">
          부위별 주간 목표를 정하면 여기서 채워져요.
        </CardMessage>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map((r) => (
            <li
              key={r.key}
              className="grid grid-cols-[40px_minmax(0,1fr)_56px] items-center gap-3"
            >
              <span className="text-sm font-medium text-ink">{r.label}</span>
              <ProgressBar
                pct={r.pct}
                className="h-2.5"
                barClassName={r.pct >= 100 ? 'bg-primary' : 'bg-primary-soft'}
              />
              <span className="text-right font-display text-sm font-semibold text-ink">
                {r.done}
                <span className="text-ink-faint"> / {r.target}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/workouts"
        className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-on-primary hover:opacity-90"
      >
        <Plus className="h-4 w-4" aria-hidden />
        오늘 운동 기록하기
      </Link>
    </TodayCard>
  );
}
