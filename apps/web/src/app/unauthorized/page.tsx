import Link from 'next/link';
import { Lock } from 'lucide-react';

export const metadata = {
  title: '로그인이 필요해요 · Rally',
};

// Safety-net page for unexpected 401s (e.g. upstream API rejects the request).
// The normal auth flow redirects unauthenticated visitors to /login, so users
// should rarely land here.
// 로그인이 풀린 상태라 [홈으로]는 결국 로그인 화면으로 가서 버튼은 [로그인하기] 하나만.
export default function UnauthorizedPage() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-linear-to-br from-zinc-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          <Lock className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          로그인이 필요해요
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          로그인이 풀렸어요. 다시 로그인하면 이어서 쓸 수 있어요.
        </p>

        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}
