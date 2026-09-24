import type { QuestionCategory, RandomQuestion } from '@repo/shared';
import { getDailyQuestions, getQuestionCategories } from '../../lib/api';
import { todayInSeoul, toISODate } from '../../lib/routines-week';
import { CategoryFilterChips } from '../../components/learn/CategoryFilterChips';
import { LearnCard } from './LearnCard';

export const metadata = {
  title: '오늘의 학습 · Rally',
};

// Daily quota: server returns today's 5 questions (deterministic by
// owner+date). `?q=<uuid>` on the URL pins the initial card so refresh
// preserves the current position. LearnCard mirrors `?q=` via
// history.replaceState on prev/next. `?categories=<csv>`가 있으면 그
// 카테고리들 안에서만 5개를 뽑음.
export default async function LearnPage({
  searchParams,
}: PageProps<'/learn'>) {
  const sp = await searchParams;
  const rawQ = sp.q;
  const qParam = typeof rawQ === 'string' ? rawQ : undefined;
  const rawCategories = sp.categories;
  const selectedCategories = parseCategoriesParam(rawCategories);
  const date = toISODate(todayInSeoul());

  let daily: RandomQuestion[] = [];
  let categories: QuestionCategory[] = [];
  try {
    [daily, categories] = await Promise.all([
      getDailyQuestions(date, selectedCategories),
      getQuestionCategories(),
    ]);
  } catch (e) {
    // UI는 그대로 empty state로 fall through — 다만 실 데이터 없음/API 500/
    // 인증 실패 등을 구분할 수 있게 서버 로그(Vercel Function Logs)에는 남김.
    console.error('[learn] daily/categories fetch failed', e);
  }

  const header = (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">오늘의 학습</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          답을 확인한 뒤 &lsquo;이해완료&rsquo; 또는 &lsquo;복습필요&rsquo;로 표시해두세요.
        </p>
      </div>
      <CategoryFilterChips
        categories={categories}
        selected={selectedCategories}
      />
    </header>
  );

  if (daily.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-6">
        {header}
        <p className="rounded-md border border-zinc-200 bg-zinc-50 p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          {selectedCategories.length > 0
            ? '고른 카테고리에서 뽑을 질문이 없어요. 다른 카테고리를 선택해보세요.'
            : '오늘 풀어볼 질문이 없어요. 잠시 뒤에 다시 열어보세요.'}
        </p>
      </div>
    );
  }

  const initialIndex = pickInitialIndex(daily, qParam);

  return (
    <div className="flex flex-col gap-4 p-6">
      {header}
      {/* 카테고리 필터 변경은 router.push 소프트 네비게이션이라 LearnCard 인스턴스가
          재사용됨. useState 초기값(shadow, initialIndex)은 첫 마운트에만 계산되므로
          key로 재마운트를 강제해 새 daily set에 맞춰 재동기화. */}
      <LearnCard
        key={selectedCategories.join(',')}
        questions={daily}
        initialIndex={initialIndex}
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
