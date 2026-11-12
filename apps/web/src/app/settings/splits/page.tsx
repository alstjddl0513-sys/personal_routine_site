import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getExercises, getWorkoutSplits } from '../../../lib/api';
import { SplitsManager } from '../../../components/settings/SplitsManager';

export const metadata = {
  title: '분할 · Rally',
};

export default async function SplitsSettingsPage() {
  const [{ splits }, exercises] = await Promise.all([getWorkoutSplits(), getExercises()]);

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
        <h1 className="text-xl font-semibold">분할</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          만든 순서대로 돌아가며 운동해요. 상체를 했다면 다음엔 하체 차례예요.
        </p>
      </header>

      <SplitsManager initial={splits} exercises={exercises} />
    </div>
  );
}
