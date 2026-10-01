import { Suspense } from 'react';
import { getRoutineChecks, getTimeBlocks } from '../../../lib/api';
import {
  addDays,
  mondayOf,
  monthOf,
  monthWeekLabel,
  toISODate,
  weekOf,
} from '../../../lib/routines-week';
import { calcBestDailyStreak, calcDailyStreak } from '../../../lib/streak';
import { StreakBadge } from '../../../components/StreakBadge';
import { BlockCompletionRanking } from '../../../components/routines/stats/BlockCompletionRanking';
import { BlockMonthCard } from '../../../components/routines/stats/BlockMonthCard';
import { KpiCard, type KpiPeriod } from '../../../components/routines/stats/KpiCard';
import { WeekdayAvgBars } from '../../../components/routines/stats/WeekdayAvgBars';
import { WeeklyBlockGrid } from '../../../components/routines/stats/WeeklyBlockGrid';
import { Skeleton } from '../../../components/Skeleton';
import type { RoutineCheck } from '@repo/shared';

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

// 날짜별 "모든 블록 체크된 날" 개수 — "완료 일수" 엄격 집계.
// 라벨 뜻("완료")에 맞게 — 1개만 체크해도 완료로 집계하면 과장.
function countStrictDoneDays(
  checks: RoutineCheck[],
  blockCount: number,
): number {
  if (blockCount === 0) return 0;
  const blocksByDate = new Map<string, Set<string>>();
  for (const c of checks) {
    const s = blocksByDate.get(c.date) ?? new Set<string>();
    s.add(c.blockId);
    blocksByDate.set(c.date, s);
  }
  return [...blocksByDate.values()].filter((s) => s.size === blockCount).length;
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

  // 월간 데이터 (히트맵, BlockMonthCard, KPI 월 토글).
  const month = monthOf(today);
  const monthChecks = allChecks.filter(
    (c) => c.date >= month.gridFrom && c.date <= month.gridTo,
  );
  // calendar month boundaries (예: Oct 1 ~ Oct 31) — grid range보다 좁음.
  const inMonthDates: string[] = [];
  for (const d of month.gridDays) {
    if (d.getMonth() + 1 === month.month) inMonthDates.push(toISODate(d));
  }
  const monthStartIso = inMonthDates[0];
  const monthEndIso = inMonthDates[inMonthDates.length - 1];
  const monthlyChecks = monthChecks.filter(
    (c) => c.date >= monthStartIso && c.date <= monthEndIso,
  );

  // KPI용 주/월 데이터.
  const weekly: KpiPeriod = {
    checkCount: weekChecks.length,
    doneDays: countStrictDoneDays(weekChecks, blocks.length),
    totalDays: 7,
    blockCount: blocks.length,
  };
  const monthly: KpiPeriod = {
    checkCount: monthlyChecks.length,
    doneDays: countStrictDoneDays(monthlyChecks, blocks.length),
    totalDays: inMonthDates.length,
    blockCount: blocks.length,
  };

  // BlockMonthCard용: 블록별 그룹핑.
  const monthChecksByBlock = new Map<string, typeof monthChecks>();
  for (const c of monthChecks) {
    const arr = monthChecksByBlock.get(c.blockId);
    if (arr) arr.push(c);
    else monthChecksByBlock.set(c.blockId, [c]);
  }

  // 일간 루틴 스트릭 (any-block-checked 기준).
  const successDays = new Set(allChecks.map((c) => c.date));
  const currentStreak = calcDailyStreak(successDays, today);
  const bestStreak = calcBestDailyStreak(successDays, streakFrom, today);

  return (
    <>
      <StreakBadge
        label="루틴 스트릭"
        current={currentStreak}
        best={bestStreak}
        unit="일"
      />

      <KpiCard
        weekly={weekly}
        monthly={monthly}
        weekLabel={monthWeekLabel(week)}
        monthLabel={`${month.month}월`}
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

      {blocks.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {month.month}월 루틴
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {blocks.map((block) => (
              <BlockMonthCard
                key={block.id}
                block={block}
                month={month}
                checks={monthChecksByBlock.get(block.id) ?? []}
                today={today}
              />
            ))}
          </div>
        </section>
      ) : null}
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
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </>
  );
}
