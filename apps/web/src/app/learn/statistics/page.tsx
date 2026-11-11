import { Suspense } from 'react';
import Link from 'next/link';
import {
  getQuestionCategories,
  getQuestionCategoryStats,
  getQuestionHeatmap,
  getQuestionStatsSummary,
} from '../../../lib/api';
import { addDays, mondayOf, todayInSeoul, toISODate } from '../../../lib/routines-week';
import { calcBestDailyStreak, calcDailyStreak } from '../../../lib/streak';
import { LearnHeatmapCard } from '../../../components/learn/LearnHeatmapCard';
import { CategoryStatsCard } from '../../../components/learn/stats/CategoryStatsCard';
import { LearnSummaryBand } from '../../../components/learn/stats/LearnSummaryBand';
import { WeeklyLearnBars, type LearnWeek } from '../../../components/learn/stats/WeeklyLearnBars';
import { Skeleton } from '../../../components/Skeleton';

export const metadata = {
  title: '학습 통계 · Rally',
};

// 스트릭은 보이는 12주보다 길게(180일) 봐서 최장 기록을 찾음
const STREAK_DAYS = 180;
const WEEKS = 12;
// apps/api questions.service.ts의 DAILY_LIMIT과 같은 값(하루 5문제)
const DAILY_QUOTA = 5;

export default async function LearnStatisticsPage() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-6 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">학습 통계</h1>
        <Suspense fallback={<StatsSkeleton />}>
          <StatsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function StatsContent() {
  const today = todayInSeoul();
  const streakFrom = toISODate(addDays(today, -(STREAK_DAYS - 1)));
  const to = toISODate(today);

  const [summary, entries, categoryStats, categories] = await Promise.all([
    getQuestionStatsSummary(),
    getQuestionHeatmap({ from: streakFrom, to }),
    getQuestionCategoryStats(),
    getQuestionCategories(),
  ]);

  // 표시한 질문이 하나도 없음 — 요약 띠·그래프·표 대신 카드 하나(0을 늘어놓지 않음)
  if (summary.total === 0) {
    return (
      <div className="flex flex-col items-center gap-3.5 rounded-lg border border-line bg-surface px-6 py-11 text-center">
        <p className="text-ink-soft">아직 답한 질문이 없어요.</p>
        <Link
          href="/learn"
          className="inline-flex min-h-10 items-center rounded-md bg-button px-4 text-sm font-semibold text-white hover:opacity-90 dark:text-paper"
        >
          오늘의 학습 하러 가기 ›
        </Link>
      </div>
    );
  }

  // 스트릭: 질문을 하나라도 표시한 날
  const successDays = new Set(entries.filter((e) => e.count > 0).map((e) => e.date));
  const current = calcDailyStreak(successDays, today);
  const best = calcBestDailyStreak(successDays, addDays(today, -(STREAK_DAYS - 1)), today);
  const todayCount = entries.find((e) => e.date === to)?.count ?? 0;

  // 주별 학습량 = 날짜별 학습한 질문 수를 주(월~일)로 더함. 기록 시작 전 주는 그래프에서 비움
  const thisMonday = mondayOf(today);
  const sums = new Map<string, number>();
  for (const e of entries) {
    const [y, m, d] = e.date.split('-').map(Number);
    const key = toISODate(mondayOf(new Date(y, m - 1, d)));
    sums.set(key, (sums.get(key) ?? 0) + e.count);
  }
  const weeks: LearnWeek[] = Array.from({ length: WEEKS }, (_, i) => {
    const weekStart = toISODate(addDays(thisMonday, -(WEEKS - 1 - i) * 7));
    return { weekStart, count: sums.get(weekStart) ?? 0 };
  });
  const firstWeek = [...sums.keys()].sort()[0];
  const startIndex = firstWeek ? Math.max(0, weeks.findIndex((w) => w.weekStart >= firstWeek)) : WEEKS - 1;

  return (
    <>
      <LearnSummaryBand
        todayCount={todayCount}
        quota={DAILY_QUOTA}
        streak={current}
        bestStreak={best}
        understood={summary.understood}
        reviewNeeded={summary.reviewNeeded}
      />

      {/* 숫자보다 다음 행동 — 2주 넘게 다시 안 본 복습필요가 있을 때만. 경고 배경 없이 warn 점 하나 */}
      {summary.staleReviewNeeded > 0 ? (
        <div className="-mt-1 flex min-h-13 items-center gap-2.5 rounded-lg border border-line bg-surface px-4.5">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
          <p className="flex-1 text-ink-soft">
            2주 넘은 복습필요{' '}
            <strong className="font-bold text-ink-strong">{summary.staleReviewNeeded}개</strong>
          </p>
          <Link
            href="/learn/review"
            className="inline-flex min-h-10 shrink-0 items-center text-sm text-heading hover:underline"
          >
            복습하러 가기 ›
          </Link>
        </div>
      ) : null}

      {/* 히트맵 카드는 격자 폭만큼만(칸 20px 고정이라 넓히면 오른쪽이 빔), 남는 폭은 막대 그래프가 */}
      <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <section
          aria-labelledby="weekly-learn-title"
          className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-line bg-surface px-6 pt-5.5 pb-5"
        >
          <div className="flex min-h-7 items-center justify-between gap-2">
            <h2 id="weekly-learn-title" className="text-[17px] font-bold text-heading">
              주별 학습량
            </h2>
            <span className="text-[13px] text-ink-muted">최근 {WEEKS}주 · 질문 수</span>
          </div>
          <div className="pt-1">
            <WeeklyLearnBars weeks={weeks} startIndex={startIndex} />
          </div>
        </section>
        <LearnHeatmapCard entries={entries} today={today} weeks={WEEKS} />
      </div>

      <CategoryStatsCard stats={categoryStats} categories={categories} />
    </>
  );
}

function StatsSkeleton() {
  return (
    <>
      <Skeleton className="h-36" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-64" />
    </>
  );
}
