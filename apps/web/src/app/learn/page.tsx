import { getRandomQuestion } from '../../lib/api';
import { LearnCard } from './LearnCard';

export const metadata = {
  title: '학습 · Rally',
};

export default async function LearnPage() {
  let initial;
  try {
    initial = await getRandomQuestion();
  } catch {
    // Empty question pool — auto-seed should prevent this for logged-in users,
    // but render an empty state rather than crashing.
    return (
      <div className="flex flex-col gap-4 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">학습</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            매일 랜덤 CS 질문 한 문제.
          </p>
        </header>
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          질문이 없습니다. 온보딩 시 자동 시드가 실패했을 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">학습</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          매일 랜덤 CS 질문 한 문제. 답을 본 뒤 이해 여부를 체크.
        </p>
      </header>
      <LearnCard initial={initial} />
    </div>
  );
}
