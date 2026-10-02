'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import {
  COMPANY_EVENT_TYPES,
  COMPANY_EVENT_TYPE_LABELS,
  type CompanyEvent,
  type CompanyEventType,
} from '@repo/shared';
import {
  createCompanyEvent,
  deleteCompanyEvent,
} from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import { usePopoverPosition } from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';

const POPOVER_WIDTH = 320;
const POPOVER_HEIGHT = 320;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function formatDateShort(iso: string): string {
  // "2026-10-15" → "10/15 (수)"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const w = WEEKDAY_KO[new Date(y, mo - 1, d).getDay()];
  return `${mo}/${d} (${w})`;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EventsPopover({
  companyId,
  events,
}: {
  companyId: string;
  events: CompanyEvent[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
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

  const count = events.length;

  function onDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteCompanyEvent(id);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  function onCreate(input: {
    date: string;
    type: CompanyEventType;
    note?: string;
  }) {
    startTransition(async () => {
      try {
        await createCompanyEvent({ companyId, ...input });
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
        aria-label={count > 0 ? `일정 ${count}개 편집` : '일정 추가'}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs disabled:opacity-50"
      >
        {count > 0 ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {count}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 rounded px-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span className="whitespace-nowrap">일정</span>
          </span>
        )}
      </button>
      {open && pos ? (
        <Portal>
          <EventsPopoverBody
            events={events}
            top={pos.top}
            left={pos.left}
            popoverRef={popoverRef}
            isPending={isPending}
            onCreate={onCreate}
            onDelete={onDelete}
            onClose={() => setOpen(false)}
          />
        </Portal>
      ) : null}
    </>
  );
}

interface BodyProps {
  events: CompanyEvent[];
  top: number;
  left: number;
  popoverRef: RefObject<HTMLDivElement | null>;
  isPending: boolean;
  onCreate: (input: {
    date: string;
    type: CompanyEventType;
    note?: string;
  }) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function EventsPopoverBody({
  events,
  top,
  left,
  popoverRef,
  isPending,
  onCreate,
  onDelete,
  onClose,
}: BodyProps) {
  const [showAdd, setShowAdd] = useState(events.length === 0);
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<CompanyEventType>('interview');
  const [note, setNote] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!date) return;
    onCreate({ date, type, note: note.trim() || undefined });
    setDate(todayIso());
    setType('interview');
    setNote('');
    setShowAdd(false);
  }

  // 날짜 오름차순 (DB에서도 asc지만 안전하게 다시 정렬).
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="회사 일정 편집"
      style={{ top, left, width: POPOVER_WIDTH }}
      className="fixed z-50 flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      {sorted.length === 0 ? (
        <p className="py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
          아직 등록된 일정이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {sorted.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 py-1.5 text-xs"
            >
              <span className="w-10 shrink-0 rounded bg-zinc-100 px-1 py-0.5 text-center font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {COMPANY_EVENT_TYPE_LABELS[e.type]}
              </span>
              <span className="shrink-0 tabular-nums text-zinc-700 dark:text-zinc-300">
                {formatDateShort(e.date)}
              </span>
              <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-400">
                {e.note ?? ''}
              </span>
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                disabled={isPending}
                aria-label="일정 삭제"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              >
                <Trash2 className="h-3 w-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAdd ? (
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800"
        >
          <div className="flex gap-1.5">
            <input
              type="date"
              value={date}
              onChange={(ev) => setDate(ev.target.value)}
              required
              className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
            />
            <select
              value={type}
              onChange={(ev) =>
                setType(ev.target.value as CompanyEventType)
              }
              className="shrink-0 rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
            >
              {COMPANY_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {COMPANY_EVENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <input
            type="text"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="메모 (예: 1차 면접)"
            maxLength={200}
            className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              disabled={isPending}
              className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending || !date}
              className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              저장
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3 w-3" aria-hidden />
            일정 추가
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-1.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            닫기
          </button>
        </div>
      )}
    </div>
  );
}
