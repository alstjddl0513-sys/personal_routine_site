import { cookies } from 'next/headers';
import Link from 'next/link';
import type { QuestionCategory, RandomQuestion } from '@repo/shared';
import {
  getFavoriteQuestions,
  getMyProfile,
  getQuestionCategories,
  getReviewQuestions,
} from '../../../lib/api';
import {
  CategoryFilterChips,
  ShowAllCategoriesButton,
} from '../../../components/learn/CategoryFilterChips';
import { LearnEmpty } from '../../../components/learn/LearnEmpty';
import { QuestionCard, type LearnMode } from '../../../components/learn/QuestionCard';

export const metadata = {
  title: '복습 · Rally',
};

type ReviewMode = Extract<LearnMode, 'review' | 'favorites'>;

// 'review'(복습필요 모아보기)와 'favorites'(별표 모아보기)를 세그먼트 [복습필요 N | 별표 N]로
// 전환. 진입점은 sidebar '복습' 하나. ?mode=favorites로 상태 보존, 카테고리 칩은 양쪽 공용
// (선호는 모드별로 따로 저장).
export default async function LearnReviewPage({
  searchParams,
}: PageProps<'/learn/review'>) {
  const sp = await searchParams;
  const rawQ = sp.q;
  const qParam = typeof rawQ === 'string' ? rawQ : undefined;
  const urlCategories = parseCategoriesParam(sp.categories);
  const mode: ReviewMode = sp.mode === 'favorites' ? 'favorites' : 'review';
  // 우선순위: URL → cookie mirror → profile fallback (자세한 배경은 /learn/page.tsx)
  const prefKey = mode === 'favorites' ? 'favoritesCategories' : 'reviewCategories';
  const cookieCategories = readCookieCategories(await cookies(), mode);
  const selectedCategories =
    urlCategories ??
    cookieCategories ??
    (await getMyProfile().catch(() => null))?.preferences.learn?.[prefKey] ??
    [];
  const filtered = selectedCategories.length > 0;

  let list: RandomQuestion[] = [];
  let categories: QuestionCategory[] = [];
  // 세그먼트 개수 = 카테고리와 무관한 전체 개수
  let reviewCount = 0;
  let favoriteCount = 0;
  try {
    const [allReview, allFav, filteredList, cats] = await Promise.all([
      getReviewQuestions([]),
      getFavoriteQuestions([]),
      filtered
        ? mode === 'favorites'
          ? getFavoriteQuestions(selectedCategories)
          : getReviewQuestions(selectedCategories)
        : Promise.resolve(null),
      getQuestionCategories(),
    ]);
    reviewCount = allReview.length;
    favoriteCount = allFav.length;
    list = filteredList ?? (mode === 'favorites' ? allFav : allReview);
    categories = cats;
  } catch (e) {
    // 화면은 빈 상태로 — 원인은 서버 로그(Vercel Function Logs)에
    console.error(`[learn/review] ${mode} fetch failed`, e);
  }

  const categoryNames = Object.fromEntries(categories.map((c) => [c.key, c.label]));
  const selectedName = selectedCategories[0] ? categoryNames[selectedCategories[0]] : undefined;

  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-220 flex-col gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-col gap-1">
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">복습</h1>
          <p className="text-[15px] text-ink-soft">다시 읽고 이해했으면 이해완료로 바꿔요.</p>
        </header>

        {/* 전환과 칩 모두 "어떤 질문을 볼지" 고르는 거라 한 줄에. 넘치면 칩만 다음 줄로 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <ModeSegment
            mode={mode}
            categories={selectedCategories}
            reviewCount={reviewCount}
            favoriteCount={favoriteCount}
          />
          {categories.length > 0 ? <span aria-hidden className="h-6 w-px bg-rule" /> : null}
          <CategoryFilterChips categories={categories} selected={selectedCategories} mode={mode} />
        </div>

        {list.length === 0 ? (
          <EmptyState mode={mode} filtered={filtered} name={selectedName} selected={selectedCategories} />
        ) : (
          // 전환·칩 변경은 소프트 네비게이션이라 카드 인스턴스가 재사용됨 → key로 재마운트
          <QuestionCard
            key={`${mode}:${selectedCategories.join(',')}`}
            questions={list}
            initialIndex={pickInitialIndex(list, qParam)}
            mode={mode}
            categoryNames={categoryNames}
          />
        )}
      </div>
    </div>
  );
}

// 운동 기록 분할 탭과 같은 세그먼트. 개수는 500 ink-muted
function ModeSegment({
  mode,
  categories,
  reviewCount,
  favoriteCount,
}: {
  mode: ReviewMode;
  categories: string[];
  reviewCount: number;
  favoriteCount: number;
}) {
  const catQs = categories.length > 0 ? `&categories=${categories.join(',')}` : '';
  const reviewHref = catQs ? `/learn/review?${catQs.slice(1)}` : '/learn/review';
  const favHref = `/learn/review?mode=favorites${catQs}`;
  const items = [
    { key: 'review' as const, label: '복습필요', count: reviewCount, href: reviewHref },
    { key: 'favorites' as const, label: '별표', count: favoriteCount, href: favHref },
  ];
  return (
    <div
      role="tablist"
      aria-label="복습 모드"
      className="inline-flex h-10 shrink-0 overflow-hidden rounded-md border border-btn-border"
    >
      {items.map((it, i) => {
        const on = mode === it.key;
        return (
          <Link
            key={it.key}
            role="tab"
            aria-selected={on}
            href={it.href}
            className={`inline-flex items-center gap-1.5 px-4 text-sm text-heading ${
              i > 0 ? 'border-l border-btn-border' : ''
            } ${
              on
                ? 'bg-chip-on-bg font-bold shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                : 'bg-btn-bg hover:bg-row-hover'
            }`}
          >
            {it.label}
            <span className="font-medium text-ink-muted tabular-nums">{it.count}</span>
          </Link>
        );
      })}
    </div>
  );
}

function EmptyState({
  mode,
  filtered,
  name,
  selected,
}: {
  mode: ReviewMode;
  filtered: boolean;
  name: string | undefined;
  selected: string[];
}) {
  const where = name ?? '고른 카테고리';
  if (filtered) {
    return (
      <LearnEmpty
        message={
          mode === 'favorites' ? `${where}에 별표한 질문이 없어요.` : `${where}에 복습할 질문이 없어요.`
        }
      >
        <ShowAllCategoriesButton mode={mode} selected={selected} />
      </LearnEmpty>
    );
  }
  return (
    <LearnEmpty
      message={
        mode === 'favorites'
          ? '아직 별표한 질문이 없어요. 질문 카드의 ☆를 누르면 여기 모여요.'
          : '아직 복습할 질문이 없어요.'
      }
    >
      <Link href="/learn" className="inline-flex min-h-10 items-center text-sm text-heading hover:underline">
        오늘의 학습 하러 가기 ›
      </Link>
    </LearnEmpty>
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

// Mirror cookie 판독. 자세한 배경은 /learn/page.tsx의 동명 함수 참고.
function readCookieCategories(
  store: Awaited<ReturnType<typeof cookies>>,
  mode: ReviewMode,
): string[] | null {
  const c = store.get(`rally.learn.${mode}`);
  if (!c) return null;
  const raw = decodeURIComponent(c.value);
  if (raw.length === 0) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// /learn과 동일 정책: ?q=<uuid>가 유효하면 그 위치로. 없거나 무효면 첫 번째로.
function pickInitialIndex(questions: RandomQuestion[], urlQ: string | undefined): number {
  if (urlQ) {
    const i = questions.findIndex((q) => q.id === urlQ);
    if (i >= 0) return i;
  }
  return 0;
}
