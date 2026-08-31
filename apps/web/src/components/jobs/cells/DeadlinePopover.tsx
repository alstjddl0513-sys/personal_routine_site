'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Calendar, X } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import { usePopoverPosition } from '../../../lib/usePopoverPosition';

const POPOVER_WIDTH = 280;
const POPOVER_HEIGHT = 170;
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
}: {
  id: string;
  value: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<string | null>(value);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState(isoToLocalInput(value));
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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
      setDraft(isoToLocalInput(current));
      queueMicrotask(() => inputRef.current?.focus());
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

  function commit(nextIso: string | null) {
    if (nextIso === current) {
      setOpen(false);
      return;
    }
    const prev = current;
    setCurrent(nextIso);
    setOpen(false);
    startTransition(async () => {
      try {
        await patchCompany(id, { applicationDeadline: nextIso });
        router.refresh();
      } catch (err) {
        console.error(err);
        setCurrent(prev);
      }
    });
  }

  function save() {
    commit(localInputToIso(draft));
  }

  function clear() {
    commit(null);
  }

  const display = formatDisplay(current);
  const draftIso = localInputToIso(draft);
  const draftWeekday = draftIso ? WEEKDAY_KO[new Date(draftIso).getDay()] : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        aria-label={current ? '마감일 편집' : '마감일 추가'}
        aria-expanded={open}
      >
        {current ? (
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : null}
        <span className="whitespace-nowrap">{display}</span>
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
              <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                날짜 · 시간
                <input
                  ref={inputRef}
                  type="datetime-local"
                  value={draft}
                  min="2020-01-01T00:00"
                  max="2099-12-31T23:59"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      save();
                    }
                  }}
                  className="rounded border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
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
