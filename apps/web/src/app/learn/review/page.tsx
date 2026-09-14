import Link from 'next/link';
import type { QuestionCategory, RandomQuestion } from '@repo/shared';
import { getQuestionCategories, getReviewQuestions } from '../../../lib/api';
import { CategoryFilterChips } from '../../../components/learn/CategoryFilterChips';
import { LearnCard } from '../LearnCard';

export const metadata = {
  title: '복습 · Rally',
};

// '복습필요'로 마킹된 질문들을 spaced-repetition 순서(오래된 것부터)로 나열.
// 컴포넌트는 /learn과 동일한 LearnCard 재사용, mode='review'로 완료 문구만 분기.
// `?categories=<csv>`가 있으면 그 카테고리들 안에서만 모음.
export default async function LearnReviewPage({
  searchParams,
}: PageProps<'/learn/review'>) {
  const sp = await searchParams;
  const rawQ = sp.q;
  const qParam = typeof rawQ === 'string' ? rawQ : undefined;
  const rawCategories = sp.categories;
  const selectedCategories = parseCategoriesParam(rawCategories);

  let reviewList: RandomQuestion[] = [];
  let categories: QuestionCategory[] = [];
  try {
    [reviewList, categories] = await Promise.all([
      getReviewQuestions(selectedCategories),
      getQuestionCategories(),
    ]);
  } catch {
    // fall through to empty state
  }

  const header = (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">복습</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          &lsquo;복습필요&rsquo;로 표시한 질문을 다시 학습해보세요.
        </p>
      </div>
      <CategoryFilterChips
        categories={categories}
        selected={selectedCategories}
      />
    </header>
  );

  if (reviewList.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {header}
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {selectedCategories.length > 0 ? (
            '고른 카테고리에는 복습할 질문이 없어요. 다른 카테고리를 선택해보세요.'
          ) : (
            <>
              아직 복습할 질문이 없어요.{' '}
              <Link
                href="/learn"
                className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                학습
              </Link>
              에서 답을 확인한 뒤 &lsquo;복습필요&rsquo;를 눌러 담아두면 여기서 다시 만날 수 있어요.
            </>
          )}
        </p>
      </div>
    );
  }

  const initialIndex = pickInitialIndex(reviewList, qParam);

  return (
    <div className="flex flex-col gap-4 p-6">
      {header}
      <LearnCard
        questions={reviewList}
        initialIndex={initialIndex}
        mode="review"
      />
    </div>
  );
}

function parseCategoriesParam(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// /learn과 동일 정책: ?q=<uuid>가 유효하면 그 위치로. 없거나 무효면 첫 번째로.
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
