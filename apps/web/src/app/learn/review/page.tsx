import Link from 'next/link';
import type { RandomQuestion } from '@repo/shared';
import { getReviewQuestions } from '../../../lib/api';
import { LearnCard } from '../LearnCard';

export const metadata = {
  title: '복습 · Rally',
};

// '복습필요'로 마킹된 질문들을 spaced-repetition 순서(오래된 것부터)로 나열.
// 컴포넌트는 /learn과 동일한 LearnCard 재사용, mode='review'로 완료 문구만 분기.
export default async function LearnReviewPage({
  searchParams,
}: PageProps<'/learn/review'>) {
  const sp = await searchParams;
  const raw = sp.q;
  const qParam = typeof raw === 'string' ? raw : undefined;

  let reviewList: RandomQuestion[] = [];
  try {
    reviewList = await getReviewQuestions();
  } catch {
    // fall through to empty state
  }

  if (reviewList.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">복습</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            &lsquo;복습필요&rsquo;로 표시한 질문을 다시 학습해보세요.
          </p>
        </header>
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          아직 복습할 질문이 없어요. {' '}
          <Link
            href="/learn"
            className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            학습
          </Link>
          에서 답을 확인한 뒤 &lsquo;복습필요&rsquo;를 눌러 담아두면 여기서 다시 만날 수 있어요.
        </p>
      </div>
    );
  }

  const initialIndex = pickInitialIndex(reviewList, qParam);

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">복습</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          &lsquo;복습필요&rsquo;로 표시한 질문을 다시 학습해보세요.
        </p>
      </header>
      <LearnCard
        questions={reviewList}
        initialIndex={initialIndex}
        mode="review"
      />
    </div>
  );
}

// /learn과 동일 정책: ?q=<uuid>가 유효하면 그 위치로. 없거나 무효면 첫 번째로.
// 복습 모드는 상태가 모두 review_needed로 시작하니 "미답변 우선" 로직은 생략.
function pickInitialIndex(
  questions: RandomQuestion[],
  urlQ: string | undefined,
): number {
  if (urlQ) {
    const i = questions.findIndex((q) => q.id === urlQ);
    if (i >= 0) return i;
  }
  return 0;
}
