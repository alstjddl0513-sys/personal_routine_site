'use client';

import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useOutsideClick } from '../../lib/useOutsideClick';

interface Props {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  /** Override the icon shown next to the title. Default: Trash2 for danger, none for default. */
  icon?: React.ReactNode;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  variant = 'danger',
  icon,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dialogRef, () => !pending && onCancel(), open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  const displayIcon =
    icon ??
    (variant === 'danger' ? (
      <Trash2
        className="h-5 w-5 text-alert"
        aria-hidden
      />
    ) : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 font-plex text-ink shadow-xl"
      >
        <div className="mb-3 flex items-center gap-2">
          {displayIcon}
          <h2 className="text-[17px] font-bold">{title}</h2>
        </div>
        {description ? (
          <div className="mb-4 text-sm leading-normal text-ink-soft">
            {description}
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-btn-border bg-btn-bg px-4 text-sm text-ink hover:border-heading disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex min-h-10 cursor-pointer items-center rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50 ${
              variant === 'danger'
                ? // 위험 동작은 확인 창 안에서만 alert 채움. 다크 alert는 밝아서 글자를 어두운 바탕색으로
                'bg-alert hover:opacity-90 dark:text-paper'
                : 'bg-button hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
