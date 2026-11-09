import { Suspense } from 'react';
import Link from 'next/link';
import { WORKOUT_WEEKLY_DAYS_DEFAULT, type Exercise, type ExerciseStats } from '@repo/shared';
import {
  getExerciseStatsBatch,
  getExercises,
  getMuscleGoals,
  getMuscleSets,
  getMyProfile,
  getWeeklyVolume,
  getWorkoutDailySummary,
  getWorkoutSessionContext,
  getWorkoutSplits,
} from '../../../lib/api';
import { addDays, mondayOf, toISODate } from '../../../lib/routines-week';
import { calcBestWeeklyStreak, calcWeeklyStreak } from '../../../lib/streak';
import { classifyMuscleGroup, muscleLabel } from '../../../lib/muscle-groups';
import { ExerciseStatsCard } from '../../../components/workouts/ExerciseStatsCard';
import { MuscleGoalsCard } from '../../../components/workouts/MuscleGoalsCard';
import { RecentWorkoutDays } from '../../../components/workouts/RecentWorkoutDays';
import { WeeklyVolumeCard } from '../../../components/workouts/WeeklyVolumeCard';
import { WorkoutSummaryBand } from '../../../components/workouts/stats/WorkoutSummaryBand';
import {
  UnrecordedExercises,
  type UnrecordedItem,
} from '../../../components/workouts/stats/UnrecordedExercises';
import { Skeleton } from '../../../components/Skeleton';

const VOLUME_WEEKS = 12;
const HISTORY_LIMIT = 12;
const STREAK_WEEKS = 26; // ~6 months for best-streak lookback
const RECENT_DAYS = 7;
const GROUPS = [
  { key: 'upper', label: '상체' },
  { key: 'lower', label: '하체' },
  { key: 'other', label: '기타' },
] as const;

// '2026-11-09' → '11.09'
const mmdd = (iso: string) => `${iso.slice(5, 7)}.${iso.slice(8, 10)}`;

export default async function WorkoutsStatisticsPage() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-6 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">운동 통계</h1>
        <Suspense fallback={<WorkoutsStatisticsSkeleton />}>
          <WorkoutsStatisticsContent />
        </Suspense>
      </div>
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
  const lastWeekFrom = toISODate(addDays(currentMon, -7));

  const [exercises, days, volumeEntries, muscleGoals, muscleSets, profile, splitsRes] =
    await Promise.all([
      getExercises(),
      // '운동한 날' = 횟수 적힌 세트가 있는 날만(메모만 적은 날 X). 스트릭·이번 주·최근 목록이 같이 씀
      getWorkoutDailySummary({ from: streakFrom, to: rangeTo }),
      getWeeklyVolume({ from: volumeFrom, to: rangeTo }),
      getMuscleGoals(),
      getMuscleSets({ from: weekFrom, to: weekTo }),
      getMyProfile().catch(() => null),
      getWorkoutSplits().catch(() => null),
    ]);

  // 종목이 0개 — 요약 띠·카드 대신 카드 하나(0 숫자를 늘어놓지 않음)
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-10 text-center">
        <p className="text-ink-soft">아직 등록한 운동이 없어요.</p>
        <Link
          href="/workouts?add=1"
          className="inline-flex min-h-10 items-center rounded-md bg-button px-4 text-sm font-semibold text-white hover:opacity-90 dark:text-paper"
        >
          운동 기록에서 종목 추가하기 ›
        </Link>
      </div>
    );
  }

  // 주간 운동 목표(설정 › 주간 운동 목표). 없으면 기본 3일
  const weeklyTarget =
    profile?.preferences.workout?.weeklyDaysTarget ?? WORKOUT_WEEKLY_DAYS_DEFAULT;
  const dayDates = days.map((d) => d.date);
  const currentStreak = calcWeeklyStreak(dayDates, weeklyTarget, today);
  const bestStreak = calcBestWeeklyStreak(
    dayDates,
    weeklyTarget,
    addDays(currentMon, -(STREAK_WEEKS - 1) * 7),
    currentMon,
  );
  const weekDays = days.filter((d) => d.date >= weekFrom && d.date <= weekTo).length;
  const volByWeek = new Map(volumeEntries.map((e) => [e.weekStart, e.volumeKg]));

  const statsById = await getExerciseStatsBatch({
    exerciseIds: exercises.map((e) => e.id),
    limit: HISTORY_LIMIT,
  });

  // 종목 카드: 상체·하체·기타 묶음, 묶음 안은 최근에 한 종목부터.
  // 무게 기록이 없는 종목(그래프를 못 그림 — 아직 안 한 종목·맨몸 운동)은 맨 아래 접기
  const emptyStats: ExerciseStats = { history: [], pr: null };
  const withStats = exercises.map((e) => ({ exercise: e, stats: statsById[e.id] ?? emptyStats }));
  const hasWeight = (s: ExerciseStats) => s.history.length > 0 || !!s.pr;
  const recorded = withStats.filter((x) => hasWeight(x.stats));
  const unrecorded = withStats.filter((x) => !hasWeight(x.stats));
  const lastDate = (s: ExerciseStats) => s.history[0]?.sessionDate ?? s.pr?.sessionDate ?? '';
  const grouped = GROUPS.map((g) => ({
    ...g,
    items: recorded
      .filter((x) => classifyMuscleGroup(x.exercise.targetMuscle) === g.key)
      .sort((a, b) => lastDate(b.stats).localeCompare(lastDate(a.stats))),
  })).filter((g) => g.items.length > 0);

  // 무게 없이 기록한 맨몸 운동의 '최근 기록' 날짜 — 운동 기록 화면이 쓰는 session-context 재사용
  let unrecordedItems: UnrecordedItem[] = [];
  if (unrecorded.length > 0) {
    const ctx = await getWorkoutSessionContext({
      exerciseIds: unrecorded.map((x) => x.exercise.id),
      beforeDate: toISODate(addDays(today, 1)),
    }).catch(() => null);
    unrecordedItems = unrecorded.map((x) => ({
      id: x.exercise.id,
      name: x.exercise.name,
      muscle: muscleLabel(x.exercise.targetMuscle) ?? '기타',
      lastDate: ctx?.previous[x.exercise.id]?.date ?? null,
    }));
  }

  return (
    <>
      <WorkoutSummaryBand
        range={`${mmdd(weekFrom)} – ${mmdd(weekTo)}`}
        target={weeklyTarget}
        streak={currentStreak}
        bestStreak={bestStreak}
        weekDays={weekDays}
        thisWeekKg={volByWeek.get(weekFrom) ?? 0}
        lastWeekKg={volByWeek.get(lastWeekFrom) ?? 0}
      />

      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <WeeklyVolumeCard
          entries={volumeEntries}
          today={today}
          weeks={VOLUME_WEEKS}
          firstDay={dayDates.at(-1) ?? null}
        />
        <RecentWorkoutDays
          days={days.slice(0, RECENT_DAYS)}
          showSplit={(splitsRes?.splits.length ?? 0) > 0}
        />
      </div>

      <MuscleGoalsCard goals={muscleGoals} entries={muscleSets} />

      <section aria-labelledby="exercise-records-title" className="flex flex-col gap-4">
        <h2 id="exercise-records-title" className="text-[17px] font-bold text-heading">
          종목별 기록
        </h2>
        {grouped.map((g) => (
          <div key={g.key} className="flex flex-col gap-2.5">
            <h3 className="text-[15px] font-bold text-heading">
              {g.label} <span className="font-medium text-ink-muted">{g.items.length}</span>
            </h3>
            <ExerciseGrid items={g.items} />
          </div>
        ))}
        {unrecordedItems.length > 0 ? <UnrecordedExercises items={unrecordedItems} /> : null}
      </section>
    </>
  );
}

function ExerciseGrid({ items }: { items: { exercise: Exercise; stats: ExerciseStats }[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((x) => (
        <ExerciseStatsCard key={x.exercise.id} exercise={x.exercise} stats={x.stats} />
      ))}
    </div>
  );
}

function WorkoutsStatisticsSkeleton() {
  return (
    <>
      <Skeleton className="h-40" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
      <Skeleton className="h-32" />
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    </>
  );
}
