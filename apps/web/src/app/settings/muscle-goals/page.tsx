import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { WORKOUT_WEEKLY_DAYS_DEFAULT } from '@repo/shared';
import { getMuscleGoals, getMyProfile } from '../../../lib/api';
import { MuscleGoalsManager } from '../../../components/settings/MuscleGoalsManager';
import { WeeklyDaysGoalField } from '../../../components/settings/WeeklyDaysGoalField';

export const metadata = {
  title: '주간 운동 목표 · Rally',
};

export default async function MuscleGoalsSettingsPage() {
  const [goals, profile] = await Promise.all([
    getMuscleGoals(),
    getMyProfile().catch(() => null),
  ]);
  const weeklyDays =
    profile?.preferences.workout?.weeklyDaysTarget ?? WORKOUT_WEEKLY_DAYS_DEFAULT;

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          설정
        </Link>
        <h1 className="text-xl font-semibold">주간 운동 목표</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          한 주에 며칠, 부위별로 몇 세트 할지 정해두세요.
        </p>
      </header>

      <WeeklyDaysGoalField initial={weeklyDays} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">부위별 세트</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">무게·횟수를 모두 적은 세트만 세요.</p>
        <MuscleGoalsManager initial={goals} />
      </section>
    </div>
  );
}
