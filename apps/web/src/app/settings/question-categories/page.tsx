import { getQuestionCategories } from '../../../lib/api';
import { QuestionCategoriesManager } from '../../../components/settings/QuestionCategoriesManager';
import { SettingsSubPage } from '../../../components/settings/SettingsSubPage';

export const metadata = {
  title: '학습 카테고리 · Rally',
};

export default async function QuestionCategoriesSettingsPage() {
  const categories = await getQuestionCategories();
  return (
    <SettingsSubPage title="학습 카테고리" desc="학습 질문에 붙일 카테고리를 정리해두세요.">
      <QuestionCategoriesManager initial={categories} />
    </SettingsSubPage>
  );
}
