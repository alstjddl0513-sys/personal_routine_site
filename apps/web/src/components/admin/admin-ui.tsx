// 'use client' 없음 — 훅이 없어 서버 컴포넌트(개요의 날짜 포맷)에서도 그대로 씀.
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Check } from 'lucide-react';
import { FOCUS_RING } from '../settings/lists/ListCard';

// 관리자 화면 공통 작은 부품 (docs/design/rally-admin*.html).

/** alert 채움 — 차단 · 영구 삭제(ListConfirmDialog의 [삭제]와 같은 모양) */
export const BUTTON_DANGER =
  'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md bg-alert px-4 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-default disabled:opacity-50 dark:text-paper';

/** 테두리 배지 — 색은 클래스로(테두리 · 글자 · 점). 점이 있으면 색만으로 구분하지 않게 글자와 같이 */
export function DotBadge({
  children,
  text,
  border,
  dot,
}: {
  children: ReactNode;
  text: string;
  border: string;
  /** 점 색(bg-*). 없으면 점 없이 */
  dot?: string;
}) {
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center gap-1.25 rounded-sm border ${dot ? 'pr-1.75 pl-1.5' : 'px-1.75'} text-xs font-semibold ${border} ${text}`}
    >
      {dot ? <span aria-hidden className={`h-1.25 w-1.25 rounded-full ${dot}`} /> : null}
      {children}
    </span>
  );
}

/** 목록 위 오류 한 줄 — 흰 바탕 + alert 테두리 · 점 · 글자 */
export function AdminError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex min-h-10 items-center gap-2 rounded-md border border-alert bg-surface px-3.5 text-sm text-alert"
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-alert" />
      {message}
    </div>
  );
}

/** 20px 체크박스(채용 리포트 툴바와 같은 모양) */
export function Checkbox({
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <span className={`relative inline-flex h-5 w-5 shrink-0 ${className}`}>
      <input
        type="checkbox"
        className={`peer h-5 w-5 cursor-pointer appearance-none rounded-sm border border-check-off bg-surface checked:border-primary checked:bg-primary disabled:cursor-default disabled:opacity-50 ${FOCUS_RING}`}
        {...rest}
      />
      <Check
        aria-hidden
        strokeWidth={2.5}
        className="pointer-events-none absolute inset-0 m-auto hidden h-3.5 w-3.5 text-white peer-checked:block dark:text-paper"
      />
    </span>
  );
}

/** 20px 라디오 원 */
export function Radio({
  className = '',
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <input
      type="radio"
      className={`h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-btn-border bg-surface checked:border-primary checked:bg-[radial-gradient(circle,var(--rally-primary)_4.5px,transparent_5px)] disabled:cursor-default disabled:opacity-50 ${FOCUS_RING} ${className}`}
      {...rest}
    />
  );
}

// 날짜는 서울 기준으로 고정 — 서버(UTC)에서 먼저 그린 글자와 브라우저 글자가 어긋나지 않게(다른 화면과 같은 방식).
const SEOUL_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function seoulParts(iso: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of SEOUL_PARTS.formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

/** 2026.11.15 */
export function formatDotDate(iso: string): string {
  const p = seoulParts(iso);
  return `${p.year}.${p.month}.${p.day}`;
}

/** 2026.11.15 13:58 */
export function formatDotDateTime(iso: string): string {
  const p = seoulParts(iso);
  return `${p.year}.${p.month}.${p.day} ${p.hour}:${p.minute}`;
}

/** 11/15 14:03 (피드백 · 공지 기간 — 올해 안이라 연도 없이) */
export function formatShortDateTime(iso: string): string {
  const p = seoulParts(iso);
  return `${p.month}/${p.day} ${p.hour}:${p.minute}`;
}
