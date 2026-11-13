import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export const metadata = {
  title: '페이지를 찾을 수 없어요 · Rally',
};

// Renders for unmatched routes and explicit notFound() calls.
// 본문 자리에만 뜸(화면 전체를 덮지 않음) — 사이드바로 다른 화면에 바로 갈 수 있게.
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <FileQuestion className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          페이지를 찾을 수 없어요
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          주소가 잘못됐거나 사라진 페이지예요.
        </p>

        <div className="mt-8">
          <Link
            href="/today"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            오늘 화면으로
          </Link>
        </div>
      </div>
    </div>
  );
}
