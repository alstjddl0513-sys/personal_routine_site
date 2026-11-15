import { Suspense } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
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
import { BlockCompletionRanking } from '../../../components/routines/stats/BlockCompletionRanking';
import { BlockMonthCard } from '../../../components/routines/stats/BlockMonthCard';
import { KpiCard, type KpiPeriod } from '../../../components/routines/stats/KpiCard';
import { WeekdayAvgBars } from '../../../components/routines/stats/WeekdayAvgBars';
import { Skeleton } from '../../../components/Skeleton';
import type { RoutineCheck } from '@repo/shared';

const STREAK_WINDOW_DAYS = 180;
const WEEKDAY_AVG_WEEKS = 8;
const RANKING_WINDOW_DAYS = 28;

export default async function RoutinesStatisticsPage() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-7 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">루틴 통계</h1>

        <Suspense fallback={<RoutinesStatisticsSkeleton />}>
          <RoutinesStatisticsContent />
        </Suspense>
      </div>
    </div>
  );
}

// 날짜별 "모든 블록 체크된 날" 개수 — "완료 일수" 엄격 집계.
// 라벨 뜻("완료")에 맞게 — 1개만 체크해도 완료로 집계하면 과장.
// "11.02" — 범위 표시용.
function mmdd(iso: string): string {
  return `${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

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

  // 블록이 없으면 띠·카드 대신 카드 하나.
  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-10 text-center">
        <p className="text-ink-soft">아직 만든 루틴이 없어요.</p>
        <Link
          href="/routines"
          className="inline-flex min-h-10 items-center rounded-md bg-button px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          트래커에서 루틴 추가하기 ›
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* 스트릭: 제목 바로 아래 한 줄 (섹션 간격 28px → 8px로 당김). [주|월]과 무관 */}
      <p className="-mt-5 flex items-center gap-1.5 text-ink-soft">
        지금 <strong className="font-bold text-ink-strong">{currentStreak}일</strong> 연속 · 최고{' '}
        {bestStreak}일
        {/* 기본 title 툴팁은 늦게 뜨고 클릭·포커스로는 안 떠서, hover·포커스(클릭)에 바로 뜨는 말풍선 */}
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-label="스트릭 세는 기준"
            aria-describedby="streak-tip"
            className="inline-flex h-6 w-6 cursor-help items-center justify-center rounded-full text-ink-muted hover:text-ink focus-visible:text-ink"
          >
            <Info className="h-4 w-4" aria-hidden />
          </button>
          <span
            id="streak-tip"
            role="tooltip"
            className="pointer-events-none invisible absolute top-full left-1/2 z-20 mt-1.5 flex w-max -translate-x-1/2 flex-col rounded-md bg-ink px-3 py-2 text-[13px] leading-normal break-keep whitespace-nowrap text-paper opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
          >
            <span>루틴을 하나라도 체크한 날이 이어진 날수예요.</span>
            <span>최고 기록은 최근 180일 안에서 세요.</span>
          </span>
        </span>
      </p>

      <KpiCard
        weekly={weekly}
        monthly={monthly}
        weekLabel={monthWeekLabel(week)}
        monthLabel={`${month.month}월`}
        weekRange={`${mmdd(week.from)} – ${mmdd(week.to)}`}
        monthRange={`${mmdd(monthStartIso)} – ${mmdd(monthEndIso)}`}
      />

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
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
      </div>

      <section aria-labelledby="month-routine-title" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h2 id="month-routine-title" className="text-[17px] font-bold text-heading">
            {month.month}월 루틴
          </h2>
          {/* 체크한 날·안 한 날은 색으로만 구분돼서 범례를 둠 */}
          <span className="flex items-center gap-3.5 text-[13px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-3 rounded-[3px] bg-primary" />
              체크한 날
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-3 rounded-[3px] bg-track" />
              안 한 날
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-3 w-3 rounded-[3px] shadow-[inset_0_0_0_1.5px_var(--rally-button)] dark:shadow-[inset_0_0_0_1.5px_var(--rally-primary)]"
              />
              오늘
            </span>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </>
  );
}

function RoutinesStatisticsSkeleton() {
  return (
    <>
      <Skeleton className="-mt-5 h-6 w-56" />
      <Skeleton className="h-40" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </>
  );
}
