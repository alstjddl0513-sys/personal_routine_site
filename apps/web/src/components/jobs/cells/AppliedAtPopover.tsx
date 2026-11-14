'use client';

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, X } from 'lucide-react';
import { patchCompany } from '../../../lib/api';
import { useOutsideClick } from '../../../lib/useOutsideClick';
import { usePopoverPosition } from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';
import { BUTTON_PRIMARY, BUTTON_TEXT, POPOVER_CARD, POPOVER_INPUT } from './popover-style';

// 채용 리포트 지원일 칸 (docs/design/rally-jobs-report-parts.html) — DeadlinePopover 미러. 다른 점:
// - 값이 date(YYYY-MM-DD) 문자열 그대로 (timestamptz 파싱 불필요)
// - input type="date" (시간 없음, 로컬 자정 개념)
// 팝오버: 제목 "지원일" + ✕ · 날짜 입력 · [지우기](저장된 값 있을 때만) … [저장]. 닫기는 ✕ · Esc · 바깥 클릭.

const POPOVER_WIDTH = 236;
const POPOVER_HEIGHT = 170;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

function parseDate(raw: string | null): Date | null {
  if (!raw) return null;
  // YYYY-MM-DD를 로컬 자정으로 파싱. `new Date('YYYY-MM-DD')`는 UTC 파싱이
  // 되어 표시 시각이 밀리는 문제가 있어 수동 파싱.
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d));
}

function formatDisplay(raw: string | null): string | null {
  const d = parseDate(raw);
  if (!d) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  // 리포트 머리 기간 · 마감일과 같은 점 표기("2026.11.03 (화)")
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} (${WEEKDAY_KO[d.getDay()]})`;
}

export function AppliedAtPopover({
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
        await patchCompany(id, { appliedAt: next });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  const display = formatDisplay(current);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className={`-mx-1 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-sm whitespace-nowrap outline-none hover:bg-row-hover focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)] disabled:opacity-50 ${
          display ? 'text-ink' : 'text-ink-muted'
        }`}
        aria-label={current ? '지원일 편집' : '지원일 추가'}
        aria-expanded={open}
      >
        <Calendar className="h-3.25 w-3.25 shrink-0 text-icon-faint print:hidden" aria-hidden />
        {display ?? (
          <>
            <span className="print:hidden">+ 지원일</span>
            <span className="hidden print:inline">—</span>
          </>
        )}
      </button>
      {open && pos ? (
        <Portal>
          <AppliedAtPopoverBody
            initialValue={current ?? ''}
            hasCurrent={current !== null}
            top={pos.top}
            left={pos.left}
            popoverRef={popoverRef}
            onCommit={commit}
            onClose={() => setOpen(false)}
          />
        </Portal>
      ) : null}
    </>
  );
}

interface BodyProps {
  initialValue: string;
  hasCurrent: boolean;
  top: number;
  left: number;
  popoverRef: RefObject<HTMLDivElement | null>;
  onCommit: (next: string | null) => void;
  onClose: () => void;
}

function AppliedAtPopoverBody({
  initialValue,
  hasCurrent,
  top,
  left,
  popoverRef,
  onCommit,
  onClose,
}: BodyProps) {
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  function save() {
    onCommit(draft ? draft : null);
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="지원일"
      style={{ position: 'fixed', top, left, width: POPOVER_WIDTH, zIndex: 50 }}
      className={`${POPOVER_CARD} gap-2.5! px-4! pt-3.5! pb-4!`}
    >
      <div className="-mr-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-soft">지원일</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-row-hover hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <input
        ref={inputRef}
        type="date"
        aria-label="지원일"
        value={draft}
        min="2020-01-01"
        max="2099-12-31"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
        }}
        className={`${POPOVER_INPUT} text-[15px]`}
      />
      <div className="flex items-center justify-between gap-2">
        {hasCurrent ? (
          <button type="button" onClick={() => onCommit(null)} className={`${BUTTON_TEXT} -ml-3`}>
            지우기
          </button>
        ) : (
          <span />
        )}
        <button type="button" onClick={save} className={`${BUTTON_PRIMARY} min-h-9!`}>
          저장
        </button>
      </div>
    </div>
  );
}
