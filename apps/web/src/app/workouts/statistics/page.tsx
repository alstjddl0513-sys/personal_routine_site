import { Suspense } from 'react';
import {
  getExerciseStats,
  getExercises,
  getMuscleGoals,
  getMuscleSets,
  getWeeklyVolume,
  getWorkoutSessionsRange,
} from '../../../lib/api';
import { addDays, mondayOf, toISODate } from '../../../lib/routines-week';
import { calcBestWeeklyStreak, calcWeeklyStreak } from '../../../lib/streak';
import { ExerciseStatsCard } from '../../../components/workouts/ExerciseStatsCard';
import { MuscleGoalsCard } from '../../../components/workouts/MuscleGoalsCard';
import { WeeklyVolumeCard } from '../../../components/workouts/WeeklyVolumeCard';
import { Skeleton } from '../../../components/Skeleton';
import { StreakBadge } from '../../../components/StreakBadge';

const VOLUME_WEEKS = 12;
const HISTORY_LIMIT = 12;
const STREAK_WEEKS = 26; // ~6 months for best-streak lookback
const WEEKLY_THRESHOLD = 3;

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
  const weekTo = toISODate(addDays(currentMon, 6));

  const [exercises, sessions, volumeEntries, muscleGoals, muscleSets] = await Promise.all([
    getExercises(),
    getWorkoutSessionsRange({ from: streakFrom, to: rangeTo }),
    getWeeklyVolume({ from: volumeFrom, to: rangeTo }),
    getMuscleGoals(),
    getMuscleSets({ from: weekFrom, to: weekTo }),
  ]);

  const statsList = await Promise.all(
    exercises.map((e) => getExerciseStats({ exerciseId: e.id, limit: HISTORY_LIMIT })),
  );

  const sessionDates = sessions.map((s) => s.date);
  const currentStreak = calcWeeklyStreak(sessionDates, WEEKLY_THRESHOLD, today);
  const bestStreak = calcBestWeeklyStreak(
    sessionDates,
    WEEKLY_THRESHOLD,
    addDays(currentMon, -(STREAK_WEEKS - 1) * 7),
    currentMon,
  );

  return (
    <>
      <StreakBadge
        label="운동 스트릭"
        current={currentStreak}
        best={bestStreak}
        unit="주"
        caption={`주 ${WEEKLY_THRESHOLD}회+`}
      />

      <WeeklyVolumeCard
        entries={volumeEntries}
        today={today}
        weeks={VOLUME_WEEKS}
      />

      <MuscleGoalsCard
        goals={muscleGoals}
        entries={muscleSets}
        rangeLabel="이번주"
      />

      {exercises.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          아직 등록한 운동이 없어요. 설정에서 운동 종목을 추가해보세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exercises.map((e, i) => (
            <ExerciseStatsCard key={e.id} exercise={e} stats={statsList[i]} />
          ))}
        </div>
      )}
    </>
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
