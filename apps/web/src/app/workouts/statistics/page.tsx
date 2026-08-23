import {
  getExerciseStats,
  getExercises,
  getWorkoutSessionsRange,
} from '../../../lib/api';
import { addDays, mondayOf, toISODate } from '../../../lib/routines-week';
import { ExerciseStatsCard } from '../../../components/workouts/ExerciseStatsCard';
import { HeatmapCard } from '../../../components/workouts/HeatmapCard';

const HEATMAP_WEEKS = 12;
const HISTORY_LIMIT = 12;

export default async function WorkoutsStatisticsPage() {
  const today = new Date();
  const currentMon = mondayOf(today);
  const heatmapFrom = toISODate(addDays(currentMon, -(HEATMAP_WEEKS - 1) * 7));
  const heatmapTo = toISODate(addDays(currentMon, 6));

  const [exercises, heatmapSessions] = await Promise.all([
    getExercises(),
    getWorkoutSessionsRange({ from: heatmapFrom, to: heatmapTo }),
  ]);

  const statsList = await Promise.all(
    exercises.map((e) => getExerciseStats({ exerciseId: e.id, limit: HISTORY_LIMIT })),
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">운동 통계</h1>
      </header>

      <HeatmapCard
        sessionDates={heatmapSessions.map((s) => s.date)}
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
