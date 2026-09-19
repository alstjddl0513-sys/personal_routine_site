import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getMuscleGoals } from '../../../lib/api';
import { MuscleGoalsManager } from '../../../components/settings/MuscleGoalsManager';

export const metadata = {
  title: '부위별 주간 목표 · Rally',
};

export default async function MuscleGoalsSettingsPage() {
  const goals = await getMuscleGoals();

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          설정으로 돌아가기
        </Link>
        <h1 className="text-xl font-semibold">부위별 주간 목표</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          한 주에 부위별로 몇 세트를 채울지 목표를 정해두세요.
          운동 통계의 달성률 카드가 이 목표를 기준으로 채워져요. 무게·횟수를 모두 채운 세트만 세요.
        </p>
      </header>

      <MuscleGoalsManager initial={goals} />
    </div>
  );
}
