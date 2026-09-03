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
          운동 기록 페이지에 나오는 종목을 추가·편집·아카이브·삭제합니다.
          세트 이력이 있는 종목은 삭제할 수 없고, 대신 아카이브로 숨길 수 있습니다.
        </p>
      </header>

      <ExercisesManager initial={exercises} />
    </div>
  );
}
