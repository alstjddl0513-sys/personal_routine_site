import type { RandomQuestion } from '@repo/shared';
import { getDailyQuestions } from '../../lib/api';
import { todayInSeoul, toISODate } from '../../lib/routines-week';
import { LearnCard } from './LearnCard';

export const metadata = {
  title: '오늘의 학습 · Rally',
};

// Daily quota: server returns today's 10 questions (deterministic by
// owner+date). `?q=<uuid>` on the URL pins the initial card so refresh
// preserves the current position. LearnCard mirrors `?q=` via
// history.replaceState on prev/next.
export default async function LearnPage({
  searchParams,
}: PageProps<'/learn'>) {
  const sp = await searchParams;
  const raw = sp.q;
  const qParam = typeof raw === 'string' ? raw : undefined;
  const date = toISODate(todayInSeoul());

  let daily: RandomQuestion[] = [];
  try {
    daily = await getDailyQuestions(date);
  } catch {
    // fall through to empty state
  }

  if (daily.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">오늘의 학습</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            매일 새 CS 질문 5개로 감을 유지해요.
          </p>
        </header>
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          오늘 풀어볼 질문이 없어요. 잠시 뒤에 다시 열어보세요.
        </p>
      </div>
    );
  }

  // Pick starting index: URL param if valid, else first unanswered so users
  // returning mid-day continue where they left off. If all done, start at 0
  // (the completion banner will render regardless).
  const initialIndex = pickInitialIndex(daily, qParam);

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">오늘의 학습</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          답을 확인한 뒤 &lsquo;이해완료&rsquo; 또는 &lsquo;복습필요&rsquo;로 표시해두세요.
        </p>
      </header>
      <LearnCard questions={daily} initialIndex={initialIndex} />
    </div>
  );
}

// If URL has ?q=<uuid> and it's in today's set, resume there. Else if any
// unanswered, jump to first unanswered. Else auto-show completion card
// (index === questions.length) so a user who already finished today's set
// doesn't re-land on question 1.
function pickInitialIndex(
  questions: RandomQuestion[],
  urlQ: string | undefined,
): number {
  if (urlQ) {
    const i = questions.findIndex((q) => q.id === urlQ);
    if (i >= 0) return i;
  }
  const unanswered = questions.findIndex((q) => !q.status);
  return unanswered >= 0 ? unanswered : questions.length;
}
