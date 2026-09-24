import Link from 'next/link';
import type { QuestionCategory, RandomQuestion } from '@repo/shared';
import {
  getFavoriteQuestions,
  getMyProfile,
  getQuestionCategories,
  getReviewQuestions,
} from '../../../lib/api';
import { CategoryFilterChips } from '../../../components/learn/CategoryFilterChips';
import { LearnCard, type LearnMode } from '../LearnCard';

export const metadata = {
  title: '복습 · Rally',
};

type ReviewMode = Extract<LearnMode, 'review' | 'favorites'>;

// 'review'(복습필요 마킹 모아보기)와 'favorites'(별표 모아보기) 두 모드를 상단 pill
// toggle로 병치. 진입점은 sidebar '복습' 하나 유지 (탭 늘리기 회피). ?mode=favorites로
// 상태 보존, 카테고리 chip 필터는 양쪽 공용.
export default async function LearnReviewPage({
  searchParams,
}: PageProps<'/learn/review'>) {
  const sp = await searchParams;
  const rawQ = sp.q;
  const qParam = typeof rawQ === 'string' ? rawQ : undefined;
  const rawCategories = sp.categories;
  const urlCategories = parseCategoriesParam(rawCategories);
  const mode: ReviewMode = sp.mode === 'favorites' ? 'favorites' : 'review';
  // URL 부재(null) → preferences fallback (mode별). 명시적 빈 배열은 그대로.
  const prefKey = mode === 'favorites' ? 'favoritesCategories' : 'reviewCategories';
  const selectedCategories =
    urlCategories ??
    (await getMyProfile().catch(() => null))?.preferences.learn?.[prefKey] ??
    [];

  let list: RandomQuestion[] = [];
  let categories: QuestionCategory[] = [];
  try {
    [list, categories] = await Promise.all([
      mode === 'favorites'
        ? getFavoriteQuestions(selectedCategories)
        : getReviewQuestions(selectedCategories),
      getQuestionCategories(),
    ]);
  } catch (e) {
    // UI는 그대로 empty state로 fall through — 다만 실 데이터 없음/API 500/
    // 인증 실패 등을 구분할 수 있게 서버 로그(Vercel Function Logs)에는 남김.
    console.error(`[learn/review] ${mode} fetch failed`, e);
  }

  const header = (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">복습</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {mode === 'favorites'
            ? '별표해둔 질문을 다시 훑어보세요.'
            : '‘복습필요’로 표시한 질문을 다시 학습해보세요.'}
        </p>
      </div>
      <ModeToggle mode={mode} categories={selectedCategories} />
      <CategoryFilterChips
        categories={categories}
        selected={selectedCategories}
        mode={mode}
      />
    </header>
  );

  if (list.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {header}
        <EmptyState mode={mode} filtered={selectedCategories.length > 0} />
      </div>
    );
  }

  const initialIndex = pickInitialIndex(list, qParam);

  return (
    <div className="flex flex-col gap-4 p-6">
      {header}
      {/* mode 전환/카테고리 필터 변경은 <Link>·router.push 소프트 네비게이션이라
          LearnCard 인스턴스가 재사용됨. useState 초기값(isFavorite/status shadow,
          initialIndex)은 첫 마운트에만 계산되므로 key로 재마운트를 강제해 새
          questions에 맞춰 재동기화. */}
      <LearnCard
        key={`${mode}:${selectedCategories.join(',')}`}
        questions={list}
        initialIndex={initialIndex}
        mode={mode}
      />
    </div>
  );
}

function ModeToggle({
  mode,
  categories,
}: {
  mode: ReviewMode;
  categories: string[];
}) {
  const catQs = categories.length > 0 ? `&categories=${categories.join(',')}` : '';
  const reviewHref = catQs ? `/learn/review?${catQs.slice(1)}` : '/learn/review';
  const favHref = `/learn/review?mode=favorites${catQs}`;
  return (
    <div
      role="tablist"
      aria-label="복습 모드"
      className="inline-flex w-fit items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
    >
      <Link
        role="tab"
        aria-selected={mode === 'review'}
        href={reviewHref}
        className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition-colors ${
          mode === 'review'
            ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        복습필요
      </Link>
      <Link
        role="tab"
        aria-selected={mode === 'favorites'}
        href={favHref}
        className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition-colors ${
          mode === 'favorites'
            ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
        }`}
      >
        별표
      </Link>
    </div>
  );
}

function EmptyState({ mode, filtered }: { mode: ReviewMode; filtered: boolean }) {
  if (mode === 'favorites') {
    return (
      <p className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        {filtered ? (
          '고른 카테고리에는 별표한 질문이 없어요. 다른 카테고리를 선택해보세요.'
        ) : (
          <>
            아직 별표한 질문이 없어요.{' '}
            <Link
              href="/learn"
              className="text-zinc-700 underline underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              학습
            </Link>
            에서 카드 우측 상단의 ☆를 눌러 담아두면 여기서 다시 만날 수 있어요.
          </>
        )}
      </p>
    );
  }
  return (
    <p className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {filtered ? (
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
          에서 답을 확인한 뒤 ‘복습필요’를 눌러 담아두면 여기서 다시 만날 수 있어요.
        </>
      )}
    </p>
  );
}

// URL에 categories 파라미터 자체가 없으면 null (=preferences fallback 트리거).
// 빈 문자열이면 [] (=명시적 전체 선택, preferences 무시).
function parseCategoriesParam(raw: unknown): string[] | null {
  if (raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  if (raw.length === 0) return [];
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
