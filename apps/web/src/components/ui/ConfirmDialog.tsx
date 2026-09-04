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
        className="h-5 w-5 text-rose-600 dark:text-rose-400"
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
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-3 flex items-center gap-2">
          {displayIcon}
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        {description ? (
          <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded px-3 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 md:min-h-0 md:py-1.5 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`inline-flex min-h-11 items-center rounded px-3 text-sm text-white disabled:opacity-50 md:min-h-0 md:py-1.5 ${
              variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
