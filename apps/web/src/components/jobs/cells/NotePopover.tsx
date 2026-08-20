'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { StickyNote, X } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import { usePopoverPosition } from '../../../lib/usePopoverPosition';

const POPOVER_WIDTH = 288; // w-72
const POPOVER_HEIGHT = 210;

export function NotePopover({
  id,
  value,
}: {
  id: string;
  value: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<string | null>(value);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pos = usePopoverPosition(anchorRef, open, POPOVER_HEIGHT, POPOVER_WIDTH);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCurrent(value);
  }, [value]);

  useOutsideClick([anchorRef, popoverRef], () => setOpen(false), open);

  useEffect(() => {
    if (open) {
      setDraft(current ?? '');
      queueMicrotask(() => textareaRef.current?.focus());
    }
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function commit(next: string | null) {
    if (next === current) {
      setOpen(false);
      return;
    }
    const prev = current;
    setCurrent(next);
    setOpen(false);
    startTransition(async () => {
      try {
        await patchCompany(id, { note: next });
        router.refresh();
      } catch (err) {
        console.error(err);
        setCurrent(prev);
      }
    });
  }

  function save() {
    commit(draft.trim() === '' ? null : draft);
  }

  function clear() {
    commit(null);
  }

  const preview = current ?? '';
  const truncated = preview.length > 18 ? preview.slice(0, 18) + '…' : preview;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="inline-flex w-[10rem] items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label={preview ? '메모 편집' : '메모 추가'}
        aria-expanded={open}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {truncated ? <span className="truncate">{truncated}</span> : null}
      </button>
      {mounted && open && pos
        ? createPortal(
            <div
              ref={popoverRef}
              style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: POPOVER_WIDTH,
                zIndex: 50,
              }}
              className="rounded-md border border-zinc-200 bg-white p-2 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
            >
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="메모"
                className="w-full resize-none rounded border border-zinc-200 bg-white p-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
              />
              <div className="mt-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={clear}
                  disabled={!current}
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <X className="h-3 w-3" aria-hidden />
                  삭제
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
