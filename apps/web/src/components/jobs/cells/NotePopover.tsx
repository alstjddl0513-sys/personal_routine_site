'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { StickyNote } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import {
  useMeasuredTop,
  usePopoverPosition,
} from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  BUTTON_TEXT,
  POPOVER_CARD,
  POPOVER_EDGE_MARGIN,
  POPOVER_INPUT,
  POPOVER_TITLE,
} from './popover-style';
import { TABLE_ICON_BUTTON } from './table-style';

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 240;

export function NotePopover({
  id,
  value,
  variant,
}: {
  id: string;
  value: string | null;
  variant?: 'table';
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const pos = usePopoverPosition(
    anchorRef,
    open,
    POPOVER_HEIGHT,
    POPOVER_WIDTH,
    POPOVER_EDGE_MARGIN,
  );

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
        className={
          variant === 'table'
            ? `${TABLE_ICON_BUTTON} hover:bg-row-hover ${preview ? 'text-ink-soft' : 'text-icon-faint'}`
            : `inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800 ${
                preview
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-zinc-400 dark:text-zinc-600'
              }`
        }
        aria-label={preview ? '메모 편집' : '메모 추가'}
        aria-expanded={open}
      >
        <StickyNote
          className={variant === 'table' ? 'h-3.75 w-3.75 shrink-0' : 'h-3.5 w-3.5 shrink-0'}
          strokeWidth={variant === 'table' ? 1.8 : undefined}
          aria-hidden
        />
        {truncated && variant !== 'table' ? (
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
      className={POPOVER_CARD}
    >
      <label htmlFor="company-note" className={POPOVER_TITLE}>
        메모
      </label>
      <textarea
        id="company-note"
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={5}
        maxLength={2000}
        className={`${POPOVER_INPUT} resize-none py-2 leading-relaxed`}
      />
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onCommit(null)}
          disabled={!hasCurrent}
          className={BUTTON_TEXT}
        >
          지우기
        </button>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onCancel} className={BUTTON_SECONDARY}>
            취소
          </button>
          <button type="button" onClick={save} className={BUTTON_PRIMARY}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
