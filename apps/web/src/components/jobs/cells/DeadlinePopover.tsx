'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, X } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import { usePopoverPosition } from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';

const POPOVER_WIDTH = 280;
const POPOVER_HEIGHT = 205;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

// Postgres timestamptz comes back as `2026-08-25 09:00:00+00`, which some engines
// (Firefox, Safari) refuse to parse. Normalize to ISO 8601 before feeding to Date.
function parseTimestamp(raw: string | null): Date | null {
  if (!raw) return null;
  let s = raw.replace(' ', 'T');
  // Expand short timezone offset `+00` → `+00:00`
  s = s.replace(/([+-]\d{2})$/, '$1:00');
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function isoToLocalInput(iso: string | null): string {
  const d = parseTimestamp(iso);
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDisplay(iso: string | null): string {
  const d = parseTimestamp(iso);
  if (!d) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const w = WEEKDAY_KO[d.getDay()];
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${day} (${w}) ${hh}:${mm}`;
}

export function DeadlinePopover({
  id,
  value,
  isRolling,
}: {
  id: string;
  value: string | null;
  isRolling: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentIso, setCurrentIso] = useOptimistic(value);
  const [currentRolling, setCurrentRolling] = useOptimistic(isRolling);
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

  function commit(nextIso: string | null, nextRolling: boolean) {
    // 상시채용이면 마감일은 서버에서 강제 null이 되므로 optimistic도 미리 맞춤.
    const effectiveIso = nextRolling ? null : nextIso;
    if (effectiveIso === currentIso && nextRolling === currentRolling) {
      setOpen(false);
      return;
    }
    setOpen(false);
    startTransition(async () => {
      setCurrentIso(effectiveIso);
      setCurrentRolling(nextRolling);
      try {
        await patchCompany(id, {
          applicationDeadline: effectiveIso,
          isRolling: nextRolling,
        });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label={currentRolling || currentIso ? '마감일 편집' : '마감일 추가'}
        aria-expanded={open}
      >
        {currentRolling ? (
          <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            상시
          </span>
        ) : currentIso ? (
          <>
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{formatDisplay(currentIso)}</span>
          </>
        ) : (
          <span className="whitespace-nowrap">—</span>
        )}
      </button>
      {open && pos ? (
        <Portal>
          <DeadlinePopoverBody
            initialIso={currentIso}
            initialRolling={currentRolling}
            hasCurrent={currentIso !== null || currentRolling}
            top={pos.top}
            left={pos.left}
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
  initialIso: string | null;
  initialRolling: boolean;
  hasCurrent: boolean;
  top: number;
  left: number;
  popoverRef: RefObject<HTMLDivElement | null>;
  onCommit: (nextIso: string | null, nextRolling: boolean) => void;
  onCancel: () => void;
}

function DeadlinePopoverBody({
  initialIso,
  initialRolling,
  hasCurrent,
  top,
  left,
  popoverRef,
  onCommit,
  onCancel,
}: BodyProps) {
  const [draft, setDraft] = useState(() => isoToLocalInput(initialIso));
  const [draftRolling, setDraftRolling] = useState(initialRolling);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  function save() {
    onCommit(localInputToIso(draft), draftRolling);
  }

  const draftIso = localInputToIso(draft);
  const draftWeekday = draftIso && !draftRolling
    ? WEEKDAY_KO[new Date(draftIso).getDay()]
    : null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top,
        left,
        width: POPOVER_WIDTH,
        zIndex: 50,
      }}
      className="rounded-md border border-zinc-200 bg-white p-2 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={draftRolling}
          onChange={(e) => setDraftRolling(e.target.checked)}
          className="h-3.5 w-3.5 accent-blue-600"
        />
        상시채용 (마감일 없음)
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
        날짜 · 시간
        <input
          ref={inputRef}
          type="datetime-local"
          value={draftRolling ? '' : draft}
          disabled={draftRolling}
          min="2020-01-01T00:00"
          max="2099-12-31T23:59"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
          }}
          className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 outline-none focus:border-zinc-500 disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:disabled:bg-zinc-900"
        />
      </label>
      {draftWeekday ? (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          요일: <span className="font-medium">{draftWeekday}</span>
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onCommit(null, false)}
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
