'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { StickyNote, X } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import {
  useMeasuredTop,
  usePopoverPosition,
} from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';

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
  const [current, setCurrent] = useOptimistic(value);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pos = usePopoverPosition(anchorRef, open, POPOVER_HEIGHT, POPOVER_WIDTH);

  useOutsideClick([anchorRef, popoverRef], () => setOpen(false), open);

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
    setOpen(false);
    startTransition(async () => {
      setCurrent(next);
      try {
        await patchCompany(id, { note: next });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  const preview = current ?? '';
  const truncated = preview.length > 18 ? preview.slice(0, 18) + '…' : preview;

  // 데스크톱 표에선 아이콘만(있으면 진하게) + hover 툴팁, 전체 내용은 클릭
  // 팝오버에서. 미리보기 텍스트 폭이 표를 밀어내서 열 추가 여지가 없었음.
  // 모바일 카드는 줄 단위라 공간이 있어 미리보기 유지.
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        title={preview || undefined}
        className={`inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800 ${
          preview
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-zinc-400 dark:text-zinc-600'
        }`}
        aria-label={preview ? '메모 편집' : '메모 추가'}
        aria-expanded={open}
      >
        <StickyNote className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {truncated ? (
          <span className="truncate md:hidden">{truncated}</span>
        ) : null}
      </button>
      {open && pos ? (
        <Portal>
          <NotePopoverBody
            initialNote={current}
            hasCurrent={current !== null}
            top={pos.top}
            left={pos.left}
            anchorRef={anchorRef}
            popoverRef={popoverRef}
            onCommit={commit}
            onCancel={() => setOpen(false)}
          />
        </Portal>
      ) : null}
    </>
  );
}

interface BodyProps {
  initialNote: string | null;
  hasCurrent: boolean;
  top: number;
  left: number;
  anchorRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  onCommit: (next: string | null) => void;
  onCancel: () => void;
}

function NotePopoverBody({
  initialNote,
  hasCurrent,
  top,
  left,
  anchorRef,
  popoverRef,
  onCommit,
  onCancel,
}: BodyProps) {
  // 추정 높이(POPOVER_HEIGHT)와 실제 높이 차이로 위로 뜰 때 벌어지지 않게.
  const measuredTop = useMeasuredTop(anchorRef, popoverRef, top);
  const [draft, setDraft] = useState(initialNote ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    queueMicrotask(() => textareaRef.current?.focus());
  }, []);

  function save() {
    onCommit(draft.trim() === '' ? null : draft);
  }

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: measuredTop,
        left,
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
          onClick={() => onCommit(null)}
          disabled={!hasCurrent}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
        >
          <X className="h-3 w-3" aria-hidden />
          삭제
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
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
    </div>
  );
}
