import { cookies } from 'next/headers';
import type { QuestionCategory, RandomQuestion } from '@repo/shared';
import {
  getDailyQuestions,
  getMyProfile,
  getQuestionCategories,
} from '../../lib/api';
import { readCookieCategories } from '../../lib/learn-categories';
import { todayInSeoul, toISODate } from '../../lib/routines-week';
import Link from 'next/link';
import {
  CategoryFilterChips,
  ShowAllCategoriesButton,
} from '../../components/learn/CategoryFilterChips';
import { LearnEmpty } from '../../components/learn/LearnEmpty';
import { QuestionCard } from '../../components/learn/QuestionCard';

export const metadata = {
  title: '오늘의 학습 · Rally',
};

// Daily quota: server returns today's 5 questions (deterministic by
// owner+date). `?q=<uuid>` on the URL pins the initial card so refresh
// preserves the current position. QuestionCard mirrors `?q=` via
// history.replaceState on prev/next. `?categories=<csv>`가 있으면 그
// 카테고리들 안에서만 5개를 뽑음.
export default async function LearnPage({
  searchParams,
}: PageProps<'/learn'>) {
  const sp = await searchParams;
  const rawQ = sp.q;
  const qParam = typeof rawQ === 'string' ? rawQ : undefined;
  const rawCategories = sp.categories;
  const urlCategories = parseCategoriesParam(rawCategories);
  // 우선순위: URL → cookie mirror(클라가 chip 변경 시 즉시 write) → profile
  // fallback(다른 기기·초기 진입). cookie가 있으면 profile RTT를 skip해서
  // /learn 진입이 100ms 정도 빨라짐. profile은 여전히 source of truth라
  // cookie 없을 때만 fetch.
  const cookieCategories = readCookieCategories(await cookies(), 'daily');
  const selectedCategories =
    urlCategories ??
    cookieCategories ??
    (await getMyProfile().catch(() => null))?.preferences.learn?.dailyCategories ??
    [];
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

  const categoryNames = Object.fromEntries(categories.map((c) => [c.key, c.label]));
  const selectedName = selectedCategories[0] ? categoryNames[selectedCategories[0]] : undefined;

  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-220 flex-col gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">오늘의 학습</h1>
          <p className="text-[15px] text-ink-soft">답을 확인하고 이해완료 · 복습필요로 표시해요.</p>
        </header>
        <CategoryFilterChips categories={categories} selected={selectedCategories} mode="daily" />
        {daily.length === 0 ? (
          selectedCategories.length > 0 ? (
            <LearnEmpty message={`${selectedName ?? '고른 카테고리'}에서 뽑을 질문이 없어요.`}>
              <ShowAllCategoriesButton mode="daily" selected={selectedCategories} />
            </LearnEmpty>
          ) : (
            <LearnEmpty message="오늘 풀어볼 질문이 없어요.">
              <Link href="/settings/questions" className="inline-flex min-h-10 items-center text-sm text-heading hover:underline">
                설정에서 질문 추가하기 ›
              </Link>
            </LearnEmpty>
          )
        ) : (
          // 카테고리 필터 변경은 router.push 소프트 네비게이션이라 카드 인스턴스가 재사용됨.
          // useState 초기값은 첫 마운트에만 계산되므로 key로 재마운트해 새 5문제에 맞춤.
          <QuestionCard
            key={selectedCategories.join(',')}
            questions={daily}
            initialIndex={pickInitialIndex(daily, qParam)}
            categoryNames={categoryNames}
          />
        )}
      </div>
    </div>
  );
}

// URL에 categories 파라미터 자체가 없으면 null (=preferences fallback 트리거).
// 빈 문자열이면 [] (=명시적 전체 선택, preferences 무시). 값 있으면 파싱.
function parseCategoriesParam(raw: unknown): string[] | null {
  if (raw === undefined) return null;
  if (typeof raw !== 'string') return null;
  if (raw.length === 0) return [];
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
