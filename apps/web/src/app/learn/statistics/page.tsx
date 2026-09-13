import { Suspense } from 'react';
import { getQuestionHeatmap, getQuestionStatsSummary } from '../../../lib/api';
import { addDays, toISODate } from '../../../lib/routines-week';
import { calcBestDailyStreak, calcDailyStreak } from '../../../lib/streak';
import { LearnHeatmapCard } from '../../../components/learn/LearnHeatmapCard';
import { Skeleton } from '../../../components/Skeleton';
import { StreakBadge } from '../../../components/StreakBadge';

export const metadata = {
  title: '학습 통계 · Rally',
};

// Streak lookback deeper than the heatmap so best-streak can find long runs
// beyond the 12 visible weeks.
const STREAK_DAYS = 180;
const HEATMAP_WEEKS = 12;

export default async function LearnStatisticsPage() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">학습 통계</h1>
      </header>

      <Suspense fallback={<StatsSkeleton />}>
        <StatsContent />
      </Suspense>
    </div>
  );
}

async function StatsContent() {
  const today = new Date();
  const streakFrom = toISODate(addDays(today, -(STREAK_DAYS - 1)));
  const to = toISODate(today);

  const [summary, entries] = await Promise.all([
    getQuestionStatsSummary(),
    getQuestionHeatmap({ from: streakFrom, to }),
  ]);

  // Daily streak: any date with count > 0 counts.
  const successDays = new Set(entries.filter((e) => e.count > 0).map((e) => e.date));
  const current = calcDailyStreak(successDays, today);
  const best = calcBestDailyStreak(
    successDays,
    addDays(today, -(STREAK_DAYS - 1)),
    today,
  );
  const todayCount = entries.find((e) => e.date === to)?.count ?? 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="오늘 학습" value={`${todayCount}문제`} />
        <Kpi label="총 답변" value={`${summary.total}/${summary.totalPool}`} />
        <Kpi label="이해완료" value={`${summary.understood}`} tone="emerald" />
        <Kpi label="복습필요" value={`${summary.reviewNeeded}`} tone="amber" />
      </div>

      <StreakBadge label="학습 스트릭" current={current} best={best} unit="일" />

      <LearnHeatmapCard entries={entries} today={today} weeks={HEATMAP_WEEKS} />
    </>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'emerald' | 'amber';
}) {
  const valueColor =
    tone === 'emerald'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-zinc-900 dark:text-zinc-100';
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${valueColor}`}>{value}</div>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-14" />
      <Skeleton className="h-32" />
    </>
  );
}
