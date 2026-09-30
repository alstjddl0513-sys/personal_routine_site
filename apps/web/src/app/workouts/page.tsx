import { Suspense } from 'react';
import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import type { WorkoutSessionContext, WorkoutSet } from '@repo/shared';
import {
  getExercises,
  getWorkoutSessionContext,
  getWorkoutSessionsByDate,
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
import { Skeleton } from '../../components/Skeleton';

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
  const groupFilter: MuscleGroupFilter = parseGroupFilter(first(sp.group));
  const sessionParam = first(sp.session);

  return (
    <div className="flex flex-col gap-4 p-6 pb-40 md:pb-24">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">운동 기록</h1>
          <AddExerciseButton />
        </div>
        <WorkoutDateNav date={displayDate} group={groupFilter} />
      </header>

      <Suspense fallback={<WorkoutsSkeleton />}>
        <WorkoutsContent
          dateIso={dateIso}
          dateParam={dateParam}
          groupFilter={groupFilter}
          sessionParam={sessionParam}
        />
      </Suspense>

      <RestTimer />
    </div>
  );
}

async function WorkoutsContent({
  dateIso,
  dateParam,
  groupFilter,
  sessionParam,
}: {
  dateIso: string;
  dateParam: string | undefined;
  groupFilter: MuscleGroupFilter;
  sessionParam: string | undefined;
}) {
  const [allExercises, sessions] = await Promise.all([
    getExercises(),
    getWorkoutSessionsByDate(dateIso),
  ]);

  // Stale ?session=<id> (deleted session) silently falls back to first / null.
  const activeSession =
    (sessionParam && sessions.find((s) => s.id === sessionParam)) ||
    sessions[0] ||
    null;

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

  // 종목별 previous + PR을 한 번의 배치 endpoint로. 이전엔 종목마다 개별
  // GET을 2N번 병렬로 쏘느라 Vercel(icn1) → Render(Singapore) 홉이 커넥션
  // 풀·네트워크 분산으로 200-400ms 지연. session-context 하나로 왕복 1회
  // 압축 (자세한 배경은 서버 service.getSessionContext 주석).
  const emptyContext: WorkoutSessionContext = { previous: {}, pr: {} };
  const [allSets, sessionContext] = await Promise.all([
    activeSession ? getWorkoutSets(activeSession.id) : Promise.resolve<WorkoutSet[]>([]),
    exercises.length > 0
      ? getWorkoutSessionContext({
          exerciseIds: exercises.map((e) => e.id),
          beforeDate: dateIso,
        })
      : Promise.resolve(emptyContext),
  ]);

  const setsByExercise: Record<string, WorkoutSet[]> = {};
  for (const s of allSets) {
    (setsByExercise[s.exerciseId] ??= []).push(s);
  }
  for (const list of Object.values(setsByExercise)) {
    list.sort((a, b) => a.setNumber - b.setNumber);
  }

  return (
    <>
      <div className="flex items-end justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <WorkoutGroupTabs
          active={groupFilter}
          counts={counts}
          preserveParams={{ date: dateParam }}
        />
        <Link
          href="/settings/exercises"
          className="mb-1.5 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          종목 관리
        </Link>
      </div>

      <WorkoutBoard
        exercises={exercises}
        date={dateIso}
        group={groupFilter}
        sessions={sessions}
        activeSession={activeSession}
        setsByExercise={setsByExercise}
        previousByExercise={sessionContext.previous}
        prByExercise={sessionContext.pr}
      />
    </>
  );
}

function WorkoutsSkeleton() {
  return (
    <>
      <Skeleton className="h-10" />
      <Skeleton className="h-64" />
    </>
  );
}
