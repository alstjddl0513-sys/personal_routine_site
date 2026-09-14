import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getExercises } from '../../../lib/api';
import { ExercisesManager } from '../../../components/settings/ExercisesManager';

export const metadata = {
  title: '운동 종목 관리 · Rally',
};

export default async function ExercisesSettingsPage() {
  const exercises = await getExercises(true);

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
        <h1 className="text-xl font-semibold">운동 종목 관리</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          자주 하는 운동을 등록해두고, 요즘 안 하는 종목은 잠시 숨겨두세요.
          이미 기록한 이력이 있는 종목은 지울 수 없어요. &lsquo;숨김&rsquo;으로 감춰두면 이력은 그대로 남아요.
        </p>
      </header>

      <ExercisesManager initial={exercises} />
    </div>
  );
}
