import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';

// 설정 하위 화면 공통 — 설정 첫 화면과 같은 가운데 800px 한 열.
// 머리: "‹ 설정" → 제목 26px → 설명 한 줄. 본문 블록 간격 20px.
export function SettingsSubPage({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-200 flex-col gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <header className="flex flex-col items-start gap-1">
          <Link
            href="/settings"
            className="-ml-1 inline-flex h-8 items-center gap-0.5 rounded-md px-1 text-sm text-btn-fg outline-none hover:text-heading focus-visible:shadow-[0_0_0_2px_var(--rally-chip-on-border)]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            설정
          </Link>
          <h1 className="text-[26px] leading-tight font-bold tracking-[-0.01em]">{title}</h1>
          <p className="text-[15px] text-ink-soft">{desc}</p>
        </header>
        {children}
      </div>
    </div>
  );
}
