import type { PreviousWorkout, WorkoutSet } from '@repo/shared';
import {
  getExercises,
  getPreviousWorkout,
  getWorkoutSessionByDate,
  getWorkoutSessionsRange,
  getWorkoutSets,
} from '../../lib/api';
import { addDays, mondayOf, parseISODate, toISODate } from '../../lib/routines-week';
import { AddExerciseButton } from '../../components/workouts/AddExerciseButton';
import { HeatmapCard } from '../../components/workouts/HeatmapCard';
import { WorkoutBoard } from '../../components/workouts/WorkoutBoard';
import { WorkoutDateNav } from '../../components/workouts/WorkoutDateNav';

const HEATMAP_WEEKS = 12;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function WorkoutsPage({
  searchParams,
}: PageProps<'/workouts'>) {
  const sp = await searchParams;
  const dateParam = first(sp.date);
  const displayDate = (dateParam ? parseISODate(dateParam) : null) ?? new Date();
  const dateIso = toISODate(displayDate);

  const today = new Date();
  const currentMon = mondayOf(today);
  const heatmapFrom = toISODate(addDays(currentMon, -(HEATMAP_WEEKS - 1) * 7));
  const heatmapTo = toISODate(addDays(currentMon, 6));

  const [exercises, session, heatmapSessions] = await Promise.all([
    getExercises(),
    getWorkoutSessionByDate(dateIso),
    getWorkoutSessionsRange({ from: heatmapFrom, to: heatmapTo }),
  ]);

  const [allSets, previousList] = await Promise.all([
    session ? getWorkoutSets(session.id) : Promise.resolve<WorkoutSet[]>([]),
    Promise.all(
      exercises.map((e) => getPreviousWorkout({ exerciseId: e.id, beforeDate: dateIso })),
    ),
  ]);

  const setsByExercise: Record<string, WorkoutSet[]> = {};
  for (const s of allSets) {
    (setsByExercise[s.exerciseId] ??= []).push(s);
  }
  for (const list of Object.values(setsByExercise)) {
    list.sort((a, b) => a.setNumber - b.setNumber);
  }

  const previousByExercise: Record<string, PreviousWorkout | null> = {};
  exercises.forEach((e, i) => {
    previousByExercise[e.id] = previousList[i];
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">운동 기록</h1>
          <AddExerciseButton />
        </div>
        <WorkoutDateNav date={displayDate} />
      </header>

      <WorkoutBoard
        exercises={exercises}
        date={dateIso}
        initialSession={session}
        setsByExercise={setsByExercise}
        previousByExercise={previousByExercise}
      />

      <HeatmapCard
        sessionDates={heatmapSessions.map((s) => s.date)}
        today={today}
        weeks={HEATMAP_WEEKS}
      />
    </div>
  );
}
