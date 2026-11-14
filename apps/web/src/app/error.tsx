'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { DisconnectedIcon } from '../components/ErrorIcons';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '../components/jobs/cells/popover-style';

// Route-segment error boundary. Catches errors thrown by server components,
// client components, and Route Handlers within a segment. `reset()` retries
// rendering the segment — useful for transient errors (network hiccup, etc.).
//
// 본문 자리에만 뜸(화면 전체를 덮지 않음) — 사이드바가 그대로라 다른 화면으로 바로 갈 수 있음.
// digest는 prod에서만 있고 서버 로그를 가리킴 → "오류 코드"로 보여서 피드백에 같이 적을 수 있게.
// 경고색 없음(docs/design/rally-error*.html) — 로딩 실패는 사용자 잘못이 아니고 빨강은 "큰일" 느낌.
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
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-16 font-plex">
      <div className="flex w-full max-w-105 flex-col items-center gap-3.5 text-center">
        <DisconnectedIcon className="h-10 w-10 text-icon-faint" />
        <h1 className="text-[22px] font-bold text-ink-strong">화면을 불러오지 못했어요</h1>
        <p className="text-[15px] leading-[1.6] text-ink-soft">
          잠시 후 다시 해보세요. 계속 안 되면 피드백으로 알려주세요.
        </p>
        {error.digest ? (
          <p className="font-[ui-monospace,SFMono-Regular,Menlo,monospace] text-[12.5px] text-ink-faint">
            오류 코드 {error.digest}
          </p>
        ) : null}
        <div className="mt-1.5 flex justify-center gap-2">
          <button type="button" onClick={reset} className={BUTTON_PRIMARY}>
            다시 불러오기
          </button>
          <Link href="/today" className={BUTTON_SECONDARY}>
            오늘 화면으로
          </Link>
        </div>
      </div>
    </div>
  );
}
