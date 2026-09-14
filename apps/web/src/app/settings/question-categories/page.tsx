import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getQuestionCategories } from '../../../lib/api';
import { QuestionCategoriesManager } from '../../../components/settings/QuestionCategoriesManager';

export const metadata = {
  title: '학습 카테고리 관리 · Rally',
};

export default async function QuestionCategoriesSettingsPage() {
  const categories = await getQuestionCategories();

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/settings"
          className="inline-flex w-fit items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          설정으로 돌아가기
        </Link>
        <h1 className="text-xl font-semibold">학습 카테고리 관리</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          학습 질문에 붙일 카테고리를 정리해두세요.
          지워도 이미 그 카테고리를 쓰던 질문은 그대로 남고, 필터 목록에서만 사라져요.
        </p>
      </header>

      <QuestionCategoriesManager initial={categories} />
    </div>
  );
}
