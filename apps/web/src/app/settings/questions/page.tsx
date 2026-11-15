import { getAllQuestions, getQuestionCategories } from '../../../lib/api';
import { QuestionsManager } from '../../../components/settings/QuestionsManager';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '학습 질문 · Rally',
};

export default async function QuestionsSettingsPage() {
  const [questions, categories] = await Promise.all([
    getAllQuestions(),
    getQuestionCategories(),
  ]);
  return (
    <SettingsSubPage
      title="학습 질문"
      desc="면접 준비하며 만난 질문을 모아두세요. 추가하면 오늘의 학습 · 복습에 같이 나와요."
    >
      <QuestionsManager initial={questions} categories={categories} />
    </SettingsSubPage>
  );
}
