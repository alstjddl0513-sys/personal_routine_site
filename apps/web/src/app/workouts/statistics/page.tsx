import {
  getExerciseStats,
  getExercises,
  getWorkoutSessionsRange,
} from '../../../lib/api';
import { addDays, mondayOf, toISODate } from '../../../lib/routines-week';
import { calcBestWeeklyStreak, calcWeeklyStreak } from '../../../lib/streak';
import { ExerciseStatsCard } from '../../../components/workouts/ExerciseStatsCard';
import { HeatmapCard } from '../../../components/workouts/HeatmapCard';
import { StreakBadge } from '../../../components/StreakBadge';

const HEATMAP_WEEKS = 12;
const HISTORY_LIMIT = 12;
const STREAK_WEEKS = 26; // ~6 months for best-streak lookback
const WEEKLY_THRESHOLD = 3;

export default async function WorkoutsStatisticsPage() {
  const today = new Date();
  const currentMon = mondayOf(today);
  // Fetch the wider streak window; heatmap slices its own 12-week grid.
  const rangeFrom = toISODate(addDays(currentMon, -(STREAK_WEEKS - 1) * 7));
  const rangeTo = toISODate(addDays(currentMon, 6));

  const [exercises, sessions] = await Promise.all([
    getExercises(),
    getWorkoutSessionsRange({ from: rangeFrom, to: rangeTo }),
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
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">운동 통계</h1>
      </header>

      <StreakBadge
        label="운동 스트릭"
        current={currentStreak}
        best={bestStreak}
        unit="주"
        caption={`주 ${WEEKLY_THRESHOLD}회+`}
      />

      <HeatmapCard
        sessionDates={sessionDates}
        today={today}
        weeks={HEATMAP_WEEKS}
      />

      {exercises.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          등록된 운동이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exercises.map((e, i) => (
            <ExerciseStatsCard key={e.id} exercise={e} stats={statsList[i]} />
          ))}
        </div>
      )}
    </div>
  );
}
