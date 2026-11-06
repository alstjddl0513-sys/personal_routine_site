import { Suspense } from 'react';
import Link from 'next/link';
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
import { RestTimer, RestTimerOpenButton } from '../../components/workouts/RestTimer';
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
    <div className="flex min-h-screen flex-col bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex w-full max-w-310 flex-1 flex-col gap-5 px-4 pt-6 pb-40 md:px-10 md:pt-9 md:pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">운동 기록</h1>
          <div className="flex items-center gap-2">
            <RestTimerOpenButton />
            <WorkoutDateNav date={displayDate} group={groupFilter} />
          </div>
        </header>

        <Suspense fallback={<WorkoutsSkeleton />}>
          <WorkoutsContent
            dateIso={dateIso}
            dateParam={dateParam}
            groupFilter={groupFilter}
            sessionParam={sessionParam}
          />
        </Suspense>
      </div>

      {/* 데스크톱: 본문 열 바닥에 붙는 띠 / 모바일: 기존 플로팅 버튼·패널 */}
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
      <WorkoutBoard
        groupTabs={
          // 부위 탭 + 종목 동작(관리·추가)을 카드 바로 위에 모음
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-divider">
            <WorkoutGroupTabs
              active={groupFilter}
              counts={counts}
              preserveParams={{ date: dateParam }}
            />
            <div className="mb-1.5 flex items-center gap-2">
              <Link
                href="/settings/exercises"
                className="inline-flex min-h-10 items-center px-1 text-sm text-ink-soft hover:text-ink"
              >
                종목 관리 ›
              </Link>
              <AddExerciseButton />
            </div>
          </div>
        }
        activeSetCount={allSets.length}
        totalExercises={allExercises.length}
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
      <Skeleton className="h-10 w-120 max-w-full" />
      <Skeleton className="h-11" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </>
  );
}
