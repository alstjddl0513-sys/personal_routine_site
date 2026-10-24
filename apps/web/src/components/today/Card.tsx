import Link from 'next/link';
import type { ReactNode } from 'react';

// /today 카드 공용 틀 (흰 카드 + 제목 + 우측 링크). 학습 카드는 코트 그린
// 배경이라 별도 마크업.

export function TodayCard({
  id,
  title,
  aside,
  className = '',
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-4 rounded-[22px] border border-line bg-surface p-5 md:p-6.5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-[17px] font-bold text-ink">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center text-[13px] text-link hover:underline"
    >
      {children}
    </Link>
  );
}

// 빈 상태·에러 공용 문구. 액션 유도 톤(메모리: UI copy는 사용자 톤).
export function CardMessage({
  children,
  href,
  linkLabel,
}: {
  children: ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <p className="rounded-[14px] bg-surface-muted px-4 py-5 text-sm text-ink-muted">
      {children}
      {href && linkLabel ? (
        <>
          {' '}
          <Link href={href} className="font-medium text-link hover:underline">
            {linkLabel}
          </Link>
        </>
      ) : null}
    </p>
  );
}

export const LOAD_ERROR_COPY = '지금은 불러오지 못했어요. 잠시 후 새로고침해보세요.';

export function ProgressBar({
  pct,
  className = 'h-1.5',
  barClassName = 'bg-primary',
}: {
  pct: number;
  className?: string;
  barClassName?: string;
}) {
  const w = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`overflow-hidden rounded-full bg-track ${className}`}>
      <div
        className={`h-full rounded-full ${barClassName}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}
