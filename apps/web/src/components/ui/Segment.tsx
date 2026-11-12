'use client';

import type { ReactNode } from 'react';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  /** label이 아이콘일 때 읽히는 이름·툴팁 */
  title?: string;
}

// 세그먼트 — 바깥 1px btn-border · radius 6 · 칸 사이 1px, 선택 = chip-on 배경 + 안쪽 2px + 700.
// 운동 분할 탭 · 복습 전환과 같은 모양. disabled면 회색(선택 칸 thead + btn-border + ink-muted).
export function Segment<T extends string | number>({
  options,
  value,
  onChange,
  disabled,
  label,
  size = 'md',
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  /** 묶음 이름(스크린리더) */
  label: string;
  /** md = 38px · sm = 32px */
  size?: 'md' | 'sm';
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`inline-flex shrink-0 overflow-hidden rounded-md border border-btn-border ${
        size === 'sm' ? 'h-8' : 'h-9.5'
      }`}
    >
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={on}
            aria-label={o.title}
            title={o.title}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center justify-center gap-1 text-sm outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)] ${
              size === 'sm' ? 'min-w-12 px-2.5' : 'min-w-16 px-3'
            } ${i > 0 ? 'border-l border-btn-border' : ''} ${
              disabled
                ? on
                  ? 'cursor-default bg-thead font-semibold text-ink-muted'
                  : 'cursor-default bg-surface text-icon-faint'
                : on
                  ? 'cursor-pointer bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                  : 'cursor-pointer bg-btn-bg text-ink-soft hover:bg-row-hover'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
