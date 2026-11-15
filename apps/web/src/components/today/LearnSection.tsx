import { cookies } from 'next/headers';
import { getDailyQuestions, getQuestionCategories } from '../../lib/api';
import { readCookieCategories } from '../../lib/learn-categories';
import { getToday, loadProfile, settle } from '../../lib/today-data';
import { LOAD_ERROR_COPY } from './Card';
import { LearnCard, LearnEmpty } from './LearnCard';

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
      <LearnEmpty
        message={
          questions
            ? '오늘 풀 문제가 없어요. 질문을 추가하거나 카테고리를 넓혀보세요.'
            : LOAD_ERROR_COPY
        }
      />
    );
  }

  const labelByKey = Object.fromEntries(
    (allCategories ?? []).map((c) => [c.key, c.label]),
  );
  return <LearnCard questions={questions} categoryLabels={labelByKey} />;
}
