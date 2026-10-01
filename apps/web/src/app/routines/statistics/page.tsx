import { Suspense } from 'react';
import { getRoutineChecks, getTimeBlocks } from '../../../lib/api';
import { addDays, mondayOf, toISODate, weekOf } from '../../../lib/routines-week';
import { calcBestDailyStreak, calcDailyStreak } from '../../../lib/streak';
import { StreakBadge } from '../../../components/StreakBadge';
import { BlockCompletionRanking } from '../../../components/routines/stats/BlockCompletionRanking';
import { WeekdayAvgBars } from '../../../components/routines/stats/WeekdayAvgBars';
import { WeeklyBlockGrid } from '../../../components/routines/stats/WeeklyBlockGrid';
import { WeeklyKpiCard } from '../../../components/routines/stats/WeeklyKpiCard';
import { Skeleton } from '../../../components/Skeleton';

const STREAK_WINDOW_DAYS = 180;
const WEEKDAY_AVG_WEEKS = 8;
const RANKING_WINDOW_DAYS = 28;

export default async function RoutinesStatisticsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">루틴 통계</h1>
      </header>

      <Suspense fallback={<RoutinesStatisticsSkeleton />}>
        <RoutinesStatisticsContent />
      </Suspense>
    </div>
  );
}

async function RoutinesStatisticsContent() {
  const today = new Date();
  const week = weekOf(today);
  const streakFrom = addDays(today, -(STREAK_WINDOW_DAYS - 1));
  const avgFrom = addDays(mondayOf(today), -(WEEKDAY_AVG_WEEKS - 1) * 7);

  // 180일치 한 번만 조회하고 섹션별 범위는 로컬 필터.
  const [blocks, allChecks] = await Promise.all([
    getTimeBlocks(),
    getRoutineChecks({
      from: toISODate(streakFrom),
      to: toISODate(today),
    }),
  ]);

  const weekChecks = allChecks.filter(
    (c) => c.date >= week.from && c.date <= week.to,
  );
  const avgChecks = allChecks.filter((c) => c.date >= toISODate(avgFrom));
  const rankFrom = addDays(today, -(RANKING_WINDOW_DAYS - 1));
  const rankChecks = allChecks.filter((c) => c.date >= toISODate(rankFrom));

  // 일간 루틴 스트릭 (any-block-checked 기준) — 기존 /routines의 로직 그대로.
  const successDays = new Set(allChecks.map((c) => c.date));
  const currentStreak = calcDailyStreak(successDays, today);
  const bestStreak = calcBestDailyStreak(successDays, streakFrom, today);

  // KPI "완료 일수": 이번주에 하나라도 체크된 날의 개수.
  const doneDays = new Set(weekChecks.map((c) => c.date)).size;

  return (
    <>
      <StreakBadge
        label="루틴 스트릭"
        current={currentStreak}
        best={bestStreak}
        unit="일"
      />

      <WeeklyKpiCard
        checkCount={weekChecks.length}
        doneDays={doneDays}
        blockCount={blocks.length}
      />

      <WeeklyBlockGrid
        blocks={blocks}
        checks={weekChecks}
        days={week.days}
        today={today}
      />

      <WeekdayAvgBars
        checks={avgChecks}
        blockCount={blocks.length}
        weeks={WEEKDAY_AVG_WEEKS}
      />

      <BlockCompletionRanking
        blocks={blocks}
        checks={rankChecks}
        windowDays={RANKING_WINDOW_DAYS}
      />
    </>
  );
}

function RoutinesStatisticsSkeleton() {
  return (
    <>
      <Skeleton className="h-16" />
      <Skeleton className="h-20" />
      <Skeleton className="h-56" />
      <Skeleton className="h-56" />
      <Skeleton className="h-40" />
    </>
  );
}
