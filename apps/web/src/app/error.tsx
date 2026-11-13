'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

// Route-segment error boundary. Catches errors thrown by server components,
// client components, and Route Handlers within a segment. `reset()` retries
// rendering the segment — useful for transient errors (network hiccup, etc.).
//
// 본문 자리에만 뜸(화면 전체를 덮지 않음) — 사이드바가 그대로라 다른 화면으로 바로 갈 수 있음.
// digest는 prod에서만 있고 서버 로그를 가리킴 → "오류 코드"로 보여서 피드백에 같이 적을 수 있게.
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
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          화면을 불러오지 못했어요
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          잠시 후 다시 해보세요. 계속 안 되면 피드백으로 알려주세요.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            오류 코드 <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            다시 불러오기
          </button>
          <Link
            href="/today"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            오늘 화면으로
          </Link>
        </div>
      </div>
    </div>
  );
}
