import { getMuscleGoals, getMuscleSets } from '../../lib/api';
import { muscleLabel } from '../../lib/muscle-groups';
import { addDays, mondayOf, toISODate } from '../../lib/routines-week';
import { getToday, settle } from '../../lib/today-data';
import { CardLink, CardMessage, LOAD_ERROR_COPY, ProgressBar, TodayPanel } from './Card';

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
    // 아래 '오늘의 학습'이 카드라 구분선 없이 끝냄(last).
    <TodayPanel
      id="workout-title"
      title="이번 주 운동"
      aside={<CardLink href="/workouts">기록하기</CardLink>}
      last
    >
      {sets === null || goals === null ? (
        <CardMessage>{LOAD_ERROR_COPY}</CardMessage>
      ) : rows.length === 0 ? (
        <CardMessage href="/settings/muscle-goals" linkLabel="목표 정하기">
          부위별 주간 목표를 정하면 여기서 채워져요.
        </CardMessage>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((r) => (
            <li
              key={r.key}
              className="grid grid-cols-[36px_minmax(0,1fr)_72px] items-center gap-3 text-sm"
            >
              <span>{r.label}</span>
              <ProgressBar
                pct={r.pct}
                className="h-1"
                barClassName={r.pct >= 100 ? 'bg-marigold' : 'bg-primary-soft'}
              />
              <span className="text-right text-ink-soft">
                <span className="text-ink">{r.done}</span> / {r.target}세트
              </span>
            </li>
          ))}
        </ul>
      )}
    </TodayPanel>
  );
}
