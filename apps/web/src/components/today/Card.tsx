import Link from 'next/link';
import type { ReactNode } from 'react';

// /today 섹션 공용 틀 (docs/design/rally-dashboard.html). 왼쪽 열은 흰 카드
// (TodayCard), 오른쪽 열은 카드 없이 구분선만 있는 섹션(TodayPanel).

export function SectionHead({ id, title, aside }: { id: string; title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[17px] font-bold text-heading">
        {title}
      </h2>
      {aside}
    </div>
  );
}

export const CARD_CLASS =
  'flex min-w-0 flex-col gap-3 rounded-lg border border-line bg-surface px-5 py-6 md:px-7';

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
      className={`${CARD_CLASS} ${className}`}
    >
      <SectionHead id={id} title={title} aside={aside} />
      {children}
    </section>
  );
}

// 오른쪽 열 섹션. 마지막 섹션은 last로 아래 구분선을 뺌.
export function TodayPanel({
  id,
  title,
  aside,
  last,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`flex min-w-0 flex-col gap-4 py-7 first:pt-1 ${last ? '' : 'border-b border-rule'}`}
    >
      <SectionHead id={id} title={title} aside={aside} />
      {children}
    </section>
  );
}

// 섹션 우측 이동 버튼 (테두리 버튼형).
export function CardLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-btn-border bg-btn-bg px-3.5 text-sm font-medium text-btn-fg hover:border-heading"
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
    <p className="py-3 text-sm text-ink-muted">
      {children}
      {href && linkLabel ? (
        <>
          {' '}
          <Link href={href} className="font-medium text-heading underline-offset-2 hover:underline">
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
  className = 'h-0.75',
  barClassName = 'bg-primary',
}: {
  pct: number;
  className?: string;
  barClassName?: string;
}) {
  const w = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`overflow-hidden bg-track ${className}`}>
      <div className={`h-full ${barClassName}`} style={{ width: `${w}%` }} />
    </div>
  );
}
