import type { ExerciseStatsPR, PreviousWorkout, WorkoutSet } from '@repo/shared';
import {
  getExerciseStats,
  getExercises,
  getPreviousWorkout,
  getWorkoutSessionByDate,
  getWorkoutSets,
} from '../../lib/api';
import { parseISODate, toISODate } from '../../lib/routines-week';
import {
  classifyMuscleGroup,
  parseGroupFilter,
  type MuscleGroupFilter,
} from '../../lib/muscle-groups';
import { AddExerciseButton } from '../../components/workouts/AddExerciseButton';
import { RestTimer } from '../../components/workouts/RestTimer';
import { WorkoutBoard } from '../../components/workouts/WorkoutBoard';
import { WorkoutDateNav } from '../../components/workouts/WorkoutDateNav';
import { WorkoutGroupTabs } from '../../components/workouts/WorkoutGroupTabs';

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
  const groupFilter = parseGroupFilter(first(sp.group));

  const [allExercises, session] = await Promise.all([
    getExercises(),
    getWorkoutSessionByDate(dateIso),
  ]);

  const counts: Record<MuscleGroupFilter, number> = {
    all: allExercises.length,
    upper: 0,
    lower: 0,
    other: 0,
  };
  for (const e of allExercises) {
    counts[classifyMuscleGroup(e.targetMuscle)]++;
  }

  const exercises =
    groupFilter === 'all'
      ? allExercises
      : allExercises.filter((e) => classifyMuscleGroup(e.targetMuscle) === groupFilter);

  // limit=1 fetches PR (all-time) with only 1 history row we don't use.
  // Cheaper than adding a dedicated /pr endpoint just for this page.
  const [allSets, previousList, statsList] = await Promise.all([
    session ? getWorkoutSets(session.id) : Promise.resolve<WorkoutSet[]>([]),
    Promise.all(
      exercises.map((e) => getPreviousWorkout({ exerciseId: e.id, beforeDate: dateIso })),
    ),
    Promise.all(
      exercises.map((e) => getExerciseStats({ exerciseId: e.id, limit: 1 })),
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
  const prByExercise: Record<string, ExerciseStatsPR | null> = {};
  exercises.forEach((e, i) => {
    previousByExercise[e.id] = previousList[i];
    prByExercise[e.id] = statsList[i].pr;
  });

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">운동 기록</h1>
          <AddExerciseButton />
        </div>
        <WorkoutDateNav date={displayDate} group={groupFilter} />
      </header>

      <WorkoutGroupTabs
        active={groupFilter}
        counts={counts}
        preserveParams={{ date: dateParam }}
      />

      <WorkoutBoard
        exercises={exercises}
        date={dateIso}
        initialSession={session}
        setsByExercise={setsByExercise}
        previousByExercise={previousByExercise}
        prByExercise={prByExercise}
      />

      <RestTimer />
    </div>
  );
}
