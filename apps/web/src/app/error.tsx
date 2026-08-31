'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

// Route-segment error boundary. Catches errors thrown by server components,
// client components, and Route Handlers within a segment. `reset()` retries
// rendering the segment — useful for transient errors (network hiccup, etc.).
//
// The digest is present only in production and points at the server log
// entry; we surface it so users can copy it when reporting a bug.
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          예상치 못한 오류가 발생했습니다
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          잠시 후 다시 시도하거나 홈으로 돌아가세요.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[10px] text-zinc-400 dark:text-zinc-600">
            digest: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            다시 시도
          </button>
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
