import { cookies } from 'next/headers';
import Link from 'next/link';
import { getDailyQuestions, getQuestionCategories } from '../../lib/api';
import { readCookieCategories } from '../../lib/learn-categories';
import { getToday, loadProfile, settle } from '../../lib/today-data';
import { LOAD_ERROR_COPY } from './Card';
import { LearnCard } from './LearnCard';

// /learn과 같은 5문제가 뜨도록 카테고리 선택도 /learn과 같은 순서
// (cookie mirror → profile.preferences). URL 파라미터는 /today엔 없음.
export async function LearnSection() {
  const { todayIso } = getToday();
  const categories =
    readCookieCategories(await cookies(), 'daily') ??
    (await loadProfile())?.preferences.learn?.dailyCategories ??
    [];

  const [questions, allCategories] = await Promise.all([
    settle(getDailyQuestions(todayIso, categories)),
    settle(getQuestionCategories()),
  ]);

  if (!questions || questions.length === 0) {
    return (
      <LearnShell>
        <p className="text-[15px] text-on-court-muted">
          {questions
            ? '오늘 풀 문제가 없어요. 질문을 추가하거나 카테고리를 넓혀보세요.'
            : LOAD_ERROR_COPY}
        </p>
        <Link
          href="/learn"
          className="mt-auto inline-flex min-h-11 items-center text-sm text-on-court-muted hover:text-white"
        >
          학습으로 가기 →
        </Link>
      </LearnShell>
    );
  }

  const labelByKey = Object.fromEntries(
    (allCategories ?? []).map((c) => [c.key, c.label]),
  );
  return <LearnCard questions={questions} categoryLabels={labelByKey} />;
}

// 데이터 없을 때도 같은 그린 카드 틀 유지 (레이아웃 점프 방지).
function LearnShell({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-labelledby="learn-title"
      className="flex min-h-70 min-w-0 flex-[3_1_560px] flex-col gap-4 rounded-[22px] border border-court-border bg-court p-6 text-white md:p-7.5"
    >
      <h2 id="learn-title" className="text-[13px] font-bold tracking-[0.08em] text-lime">
        오늘의 학습
      </h2>
      {children}
    </section>
  );
}
