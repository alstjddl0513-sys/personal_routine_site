import { Suspense } from 'react';
import { WORKOUT_WEEKLY_DAYS_DEFAULT, type Exercise, type ExerciseStats } from '@repo/shared';
import {
  getExerciseStatsBatch,
  getExercises,
  getMuscleGoals,
  getMuscleSets,
  getMyProfile,
  getWeeklyVolume,
  getWorkoutDailySummary,
} from '../../../lib/api';
import { addDays, mondayOf, toISODate } from '../../../lib/routines-week';
import { calcBestWeeklyStreak, calcWeeklyStreak } from '../../../lib/streak';
import { classifyMuscleGroup } from '../../../lib/muscle-groups';
import { ExerciseStatsCard } from '../../../components/workouts/ExerciseStatsCard';
import { MuscleGoalsCard } from '../../../components/workouts/MuscleGoalsCard';
import {
  RecentWorkoutDays,
  WorkoutWeekDaysCard,
} from '../../../components/workouts/RecentWorkoutDays';
import { WeeklyVolumeCard } from '../../../components/workouts/WeeklyVolumeCard';
import { Skeleton } from '../../../components/Skeleton';
import { StreakBadge } from '../../../components/StreakBadge';

const VOLUME_WEEKS = 12;
const HISTORY_LIMIT = 12;
const STREAK_WEEKS = 26; // ~6 months for best-streak lookback
const RECENT_DAYS = 7;
const GROUPS = [
  { key: 'upper', label: '상체' },
  { key: 'lower', label: '하체' },
  { key: 'other', label: '기타' },
] as const;

export default async function WorkoutsStatisticsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">운동 통계</h1>
      </header>

      <Suspense fallback={<WorkoutsStatisticsSkeleton />}>
        <WorkoutsStatisticsContent />
      </Suspense>
    </div>
  );
}

async function WorkoutsStatisticsContent() {
  const today = new Date();
  const currentMon = mondayOf(today);
  const streakFrom = toISODate(addDays(currentMon, -(STREAK_WEEKS - 1) * 7));
  const rangeTo = toISODate(addDays(currentMon, 6));
  const volumeFrom = toISODate(addDays(currentMon, -(VOLUME_WEEKS - 1) * 7));
  const weekFrom = toISODate(currentMon);
  const weekTo = rangeTo;

  const [exercises, days, volumeEntries, muscleGoals, muscleSets, profile] = await Promise.all([
    getExercises(),
    // '운동한 날' = 횟수 적힌 세트가 있는 날만(메모만 적은 날 X). 스트릭·이번 주·최근 목록이 같이 씀
    getWorkoutDailySummary({ from: streakFrom, to: rangeTo }),
    getWeeklyVolume({ from: volumeFrom, to: rangeTo }),
    getMuscleGoals(),
    getMuscleSets({ from: weekFrom, to: weekTo }),
    getMyProfile().catch(() => null),
  ]);
  // 주간 운동 목표(설정 › 주간 운동 목표). 없으면 기본 3일
  const weeklyTarget =
    profile?.preferences.workout?.weeklyDaysTarget ?? WORKOUT_WEEKLY_DAYS_DEFAULT;

  const statsById =
    exercises.length > 0
      ? await getExerciseStatsBatch({ exerciseIds: exercises.map((e) => e.id), limit: HISTORY_LIMIT })
      : {};

  const dayDates = days.map((d) => d.date);
  const currentStreak = calcWeeklyStreak(dayDates, weeklyTarget, today);
  const bestStreak = calcBestWeeklyStreak(
    dayDates,
    weeklyTarget,
    addDays(currentMon, -(STREAK_WEEKS - 1) * 7),
    currentMon,
  );

  // 종목 카드: 부위 묶음(상체·하체·기타), 묶음 안은 최근에 한 종목부터.
  // 무게 기록이 없는 종목(그래프를 못 그림 — 아직 안 한 종목·맨몸 운동)은 맨 아래 접기
  const emptyStats: ExerciseStats = { history: [], pr: null };
  const withStats = exercises.map((e) => ({ exercise: e, stats: statsById[e.id] ?? emptyStats }));
  const recorded = withStats.filter((x) => x.stats.history.length > 0 || x.stats.pr);
  const unrecorded = withStats.filter((x) => !(x.stats.history.length > 0 || x.stats.pr));
  const lastDate = (s: ExerciseStats) => s.history[0]?.sessionDate ?? s.pr?.sessionDate ?? '';
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: recorded
      .filter((x) => classifyMuscleGroup(x.exercise.targetMuscle) === g.key)
      .sort((a, b) => lastDate(b.stats).localeCompare(lastDate(a.stats))),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <StreakBadge
          label="운동 스트릭"
          current={currentStreak}
          best={bestStreak}
          unit="주"
          caption={`주 ${weeklyTarget}일+`}
          hint={`세트를 적은 날이 주 ${weeklyTarget}일 이상인 주가 몇 주 이어졌는지예요`}
        />
        <WorkoutWeekDaysCard days={days} weekFrom={weekFrom} weekTo={weekTo} target={weeklyTarget} />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <WeeklyVolumeCard entries={volumeEntries} today={today} weeks={VOLUME_WEEKS} />
        <RecentWorkoutDays days={days.slice(0, RECENT_DAYS)} />
      </div>

      <MuscleGoalsCard goals={muscleGoals} entries={muscleSets} rangeLabel="이번 주" />

      {exercises.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          아직 등록한 운동이 없어요. 설정에서 운동 종목을 추가해보세요.
        </div>
      ) : (
        <>
          {grouped.map((g) => (
            <section key={g.key} className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {g.label} <span className="font-normal text-zinc-500">{g.items.length}</span>
              </h2>
              <ExerciseGrid items={g.items} />
            </section>
          ))}
          {unrecorded.length > 0 ? (
            <details className="group rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
              <summary className="cursor-pointer text-sm text-zinc-600 dark:text-zinc-400">
                무게 기록이 없는 종목 {unrecorded.length}개
              </summary>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                {unrecorded.map((x) => x.exercise.name).join(' · ')}
              </p>
            </details>
          ) : null}
        </>
      )}
    </>
  );
}

function ExerciseGrid({ items }: { items: { exercise: Exercise; stats: ExerciseStats }[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((x) => (
        <ExerciseStatsCard key={x.exercise.id} exercise={x.exercise} stats={x.stats} />
      ))}
    </div>
  );
}

function WorkoutsStatisticsSkeleton() {
  return (
    <>
      <Skeleton className="h-16" />
      <Skeleton className="h-40" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </>
  );
}
