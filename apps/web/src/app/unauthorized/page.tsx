import Link from 'next/link';
import { Lock } from 'lucide-react';

export const metadata = {
  title: '접근 거부 · Rally',
};

// Safety-net page for unexpected 401s (e.g. upstream API rejects the request).
// The normal auth flow redirects unauthenticated visitors to /login, so users
// should rarely land here.
export default function UnauthorizedPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Lock className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          접근 권한이 없습니다
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          세션이 만료되었거나 잘못된 경로로 접근했습니다.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            로그인 페이지로
          </Link>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  );
}
