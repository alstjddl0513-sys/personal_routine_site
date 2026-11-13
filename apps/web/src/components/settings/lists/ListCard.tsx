'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

// 설정 목록 관리 화면 공통 부품 (docs/design/rally-settings-lists*.html).
// 흰 카드 안 ul, 줄 = [이름 + 뱃지 / 보조 글자 | 40px 아이콘 버튼 묶음].

/** 40px 아이콘 버튼 — 바깥 2px surface + 2px chip-on-border 포커스 링 */
export const ROW_ACTION =
  'inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted outline-none hover:bg-row-hover hover:text-ink focus-visible:shadow-[0_0_0_2px_var(--rally-surface),0_0_0_4px_var(--rally-chip-on-border)] disabled:cursor-default disabled:text-icon-faint disabled:hover:bg-transparent';

export const FOCUS_RING =
  'outline-none focus-visible:shadow-[0_0_0_2px_var(--rally-surface),0_0_0_4px_var(--rally-chip-on-border)]';

/** 입력칸 오류 테두리(POPOVER_INPUT 뒤에 붙임) */
export const INPUT_ERROR = 'border-alert!';

export function ListCard({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface px-5 py-1">{children}</div>;
}

export function ListBody({ children, ordered }: { children: ReactNode; ordered?: boolean }) {
  const cls = 'flex flex-col [&>li]:border-b [&>li]:border-divider [&>li:last-child]:border-b-0';
  return ordered ? <ol className={cls}>{children}</ol> : <ul className={cls}>{children}</ul>;
}

export function RowAction({
  label,
  title,
  children,
  className = '',
  ...rest
}: {
  /** 스크린리더 이름(대상 이름 포함) */
  label: string;
  /** 툴팁 — 없으면 label */
  title?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'children'>) {
  return (
    <button type="button" aria-label={label} title={title ?? label} className={`${ROW_ACTION} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function StatusBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 shrink-0 items-center rounded-sm border border-btn-border px-1.5 text-xs font-semibold text-ink-muted">
      {children}
    </span>
  );
}

export function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5.5 shrink-0 items-center rounded-sm bg-tag-bg px-2 text-xs font-medium text-ink-soft">
      {children}
    </span>
  );
}

/**
 * 목록 한 줄. expand가 있으면 이름 쪽 전체가 펼침 버튼(⌄ 회전), panel은 줄 아래 펼친 칸.
 * dimmed(숨김 · 일시중지됨)는 이름 ink-faint · 보조 icon-faint — 뱃지 · 버튼 아이콘도 같이 바뀌어 색만으로 구분 X.
 */
export function ListRow({
  name,
  badges,
  sub,
  actions,
  dimmed,
  expand,
  panel,
}: {
  name: ReactNode;
  badges?: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  dimmed?: boolean;
  expand?: { open: boolean; onToggle: () => void; label: string };
  panel?: ReactNode;
}) {
  const text = (
    <>
      <span className="flex min-w-0 flex-wrap items-center gap-2">
        <span className={`text-[15px] font-semibold ${dimmed ? 'text-ink-faint' : 'text-ink-strong'}`}>{name}</span>
        {badges}
        {expand ? (
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${
              expand.open ? 'rotate-180' : ''
            }`}
          />
        ) : null}
      </span>
      {sub ? (
        <span className={`block truncate text-[13px] ${dimmed ? 'text-icon-faint' : 'text-ink-muted'}`}>{sub}</span>
      ) : null}
    </>
  );
  return (
    <li>
      <div className="-mx-3 flex min-h-14 items-center gap-3 rounded-md px-3 py-2 hover:bg-row-hover">
        {expand ? (
          <button
            type="button"
            onClick={expand.onToggle}
            aria-expanded={expand.open}
            aria-label={expand.label}
            className={`flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 rounded-sm text-left ${FOCUS_RING}`}
          >
            {text}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">{text}</div>
        )}
        {actions ? <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">{actions}</div> : null}
      </div>
      {panel}
    </li>
  );
}

/** 카드 맨 아래 "+ 추가" 줄 */
export function AddLine({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="border-t border-divider py-2">
      <button
        type="button"
        onClick={onClick}
        className={`-ml-1 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm font-medium text-btn-fg hover:text-heading ${FOCUS_RING}`}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </button>
    </div>
  );
}

/** 줄 아래 · 카드 맨 아래 펼친 칸(thead 바탕, 카드 좌우 끝까지) */
export function ExpandPanel({ children, last }: { children: ReactNode; last?: boolean }) {
  return (
    <div
      className={`-mx-5 flex flex-col gap-3.5 border-t border-divider bg-thead px-5 pt-3.5 pb-4.5 ${
        last ? '-mb-1 rounded-b-lg' : ''
      }`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  className = '',
  children,
}: {
  label: string;
  /** 라벨 옆 "· 선택" 같은 작은 말 */
  hint?: string;
  error?: string | null;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="text-[13px] font-semibold text-ink-soft">
        {label}
        {hint ? <span className="font-normal text-ink-muted"> · {hint}</span> : null}
      </span>
      {children}
      {error ? <span className="text-[13px] text-alert">{error}</span> : null}
    </label>
  );
}

/** 목록 위 오류 한 줄(서버 실패) */
export function ListError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex min-h-9 items-center gap-2 rounded-md border border-line bg-surface px-3 text-sm text-alert"
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-alert" />
      {message}
    </div>
  );
}

/** 카드 안 빈 상태 한 줄 */
export function ListEmpty({ children }: { children: ReactNode }) {
  return <p className="py-7 text-center text-[15px] text-ink-soft">{children}</p>;
}

/** 저장 상태 자리(72px 고정) — "저장 중…" / "✓ 저장됨" */
export function SaveStatus({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <span role="status" className="inline-flex w-18 shrink-0 items-center gap-1 text-[13px] text-ink-faint">
      {saving ? (
        '저장 중…'
      ) : saved ? (
        <>
          <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          저장됨
        </>
      ) : null}
    </span>
  );
}
