import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export const metadata = {
  title: '페이지를 찾을 수 없습니다 · Rally',
};

// Renders for unmatched routes and explicit notFound() calls. Tone matches
// /unauthorized so the two share the same "friendly card + gradient" look.
export default function NotFound() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <FileQuestion className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          주소가 잘못됐거나 삭제된 페이지입니다.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
