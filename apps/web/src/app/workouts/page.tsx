import { Suspense } from 'react';
import type { WorkoutSessionContext, WorkoutSet } from '@repo/shared';
import {
  getExercises,
  getWorkoutSessionContext,
  getWorkoutSessionsByDate,
  getWorkoutSets,
  getWorkoutSplits,
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
import { WorkoutSettingsMenu } from '../../components/workouts/WorkoutSettingsMenu';
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
  const splitParam = first(sp.split);
  // 운동 통계 빈 상태 "종목 추가하기"에서 오면 종목 추가 창을 바로 엶
  const openAdd = first(sp.add) === '1';

  return (
    <div className="flex min-h-screen flex-col bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex w-full max-w-310 flex-1 flex-col gap-5 px-4 pt-6 pb-40 md:px-10 md:pt-9 md:pb-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">운동 기록</h1>
          <div className="flex items-center gap-4">
            <WorkoutSettingsMenu />
            <span aria-hidden className="h-6 w-px bg-rule" />
            <div className="flex items-center gap-2">
              <RestTimerOpenButton />
              <WorkoutDateNav date={displayDate} group={groupFilter} />
            </div>
          </div>
        </header>

        <Suspense fallback={<WorkoutsSkeleton />}>
          <WorkoutsContent
            dateIso={dateIso}
            dateParam={dateParam}
            groupFilter={groupFilter}
            sessionParam={sessionParam}
            splitParam={splitParam}
            openAdd={openAdd}
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
  splitParam,
  openAdd,
}: {
  dateIso: string;
  dateParam: string | undefined;
  groupFilter: MuscleGroupFilter;
  sessionParam: string | undefined;
  splitParam: string | undefined;
  openAdd: boolean;
}) {
  const [allExercises, sessions, splitsRes] = await Promise.all([
    getExercises(),
    getWorkoutSessionsByDate(dateIso),
    // 다음 차례는 보고 있는 날짜 이전 마지막 기록 기준
    getWorkoutSplits(dateIso),
  ]);
  const { splits, nextSplitId, lastSplitId } = splitsRes;
  const hasSplits = splits.length > 0;

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

  // 분할이 있으면: ?split= → 그날 기록한 분할 → 다음 차례 순으로 고르고, 그 분할의
  // 종목만(순서는 종목 순서 그대로). 분할이 없으면 지금처럼 부위 필터.
  const splitIds = new Set(splits.map((s) => s.id));
  const selectedSplitId: string | null = !hasSplits
    ? null
    : splitParam === 'all'
      ? 'all'
      : splitParam && splitIds.has(splitParam)
        ? splitParam
        : activeSession?.splitId && splitIds.has(activeSession.splitId)
          ? activeSession.splitId
          : nextSplitId;
  const selectedSplit = splits.find((s) => s.id === selectedSplitId) ?? null;

  const exercises = hasSplits
    ? selectedSplit
      ? allExercises.filter((e) => selectedSplit.exerciseIds.includes(e.id))
      : allExercises
    : groupFilter === 'all'
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
          // 카드 위 줄 — 카드를 거르는 것(분할 요약 또는 부위 탭) … [+ 종목 추가]
          // 높이 52px·세로 가운데 — 밑줄 탭도 52px라 밑줄이 아래 구분선에 붙고 버튼과 줄이 맞음
          <div className="flex min-h-13 flex-wrap items-center justify-between gap-x-4 border-b border-divider">
            {hasSplits ? (
              // 부위 탭이 빠지며 비어 보이지 않게, 지금 보고 있는 것을 한 줄로
              <p className="text-[15px] text-ink-muted">
                <strong className="font-bold text-heading">{selectedSplit?.name ?? '전체'}</strong> 종목{' '}
                {exercises.length}개
              </p>
            ) : (
              <WorkoutGroupTabs
                active={groupFilter}
                counts={counts}
                preserveParams={{ date: dateParam }}
              />
            )}
            {/* 관리 링크는 헤더 ⚙로 — 여기엔 운동하다 바로 쓰는 [+ 종목 추가]만 */}
            {/* 분할 탭을 보고 있으면 새 종목을 그 분할에도 담음(창에서 끌 수 있음) */}
            <AddExerciseButton split={selectedSplit} defaultOpen={openAdd} />
          </div>
        }
        splits={splits}
        selectedSplitId={selectedSplitId}
        nextSplitId={nextSplitId}
        lastSplitId={lastSplitId}
        allExercises={allExercises}
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
