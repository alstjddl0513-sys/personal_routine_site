import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getAllQuestions, getQuestionCategories } from '../../../lib/api';
import { QuestionsManager } from '../../../components/settings/QuestionsManager';

export const metadata = {
  title: '학습 질문 관리 · Rally',
};

export default async function QuestionsSettingsPage() {
  const [questions, categories] = await Promise.all([
    getAllQuestions(),
    getQuestionCategories(),
  ]);

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
        <h1 className="text-xl font-semibold">학습 질문 관리</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          면접 준비 중 만난 질문을 여기에 모아두세요. 등록한 순간부터 오늘의 학습·복습 풀에 자동으로 섞여요.
        </p>
      </header>

      <QuestionsManager initial={questions} categories={categories} />
    </div>
  );
}
