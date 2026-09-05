'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, X } from 'lucide-react';
import { deleteCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';

export function DeleteRowButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  useOutsideClick(dialogRef, () => !isPending && setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, isPending]);

  function confirmDelete() {
    startTransition(async () => {
      try {
        await deleteCompany(id);
        router.refresh();
        setOpen(false);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 md:hidden dark:text-red-400 dark:hover:bg-red-950/30"
      >
        삭제
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${name} 삭제`}
        className="hidden h-6 w-6 items-center justify-center rounded text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100 md:inline-flex dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-title-${id}`}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-center gap-2">
              <Trash2
                className="h-5 w-5 text-rose-600 dark:text-rose-400"
                aria-hidden
              />
              <h2
                id={`delete-title-${id}`}
                className="text-base font-semibold"
              >
                회사 삭제
              </h2>
            </div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {name}
              </span>
              을(를) 삭제할까요? 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className="rounded bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isPending ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
