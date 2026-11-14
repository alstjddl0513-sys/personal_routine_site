'use client';

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type SubmitEvent,
  type RefObject,
} from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, ChevronDown, Trash2, X } from 'lucide-react';
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
import {
  useMeasuredTop,
  usePopoverPosition,
} from '../../../lib/usePopoverPosition';
import { Portal } from '../../ui/Portal';
import { Select } from '../../ui/Select';
import {
  BUTTON_PRIMARY,
  POPOVER_CARD,
  POPOVER_CLOSE,
  POPOVER_EDGE_MARGIN,
  POPOVER_INPUT_BASE,
  POPOVER_TITLE,
} from './popover-style';
import { TABLE_ICON_BUTTON } from './table-style';

const POPOVER_WIDTH = 340;
// 전형적 케이스(일정 1~2건 + 추가 폼) 높이. 너무 크게 잡으면 trigger가 뷰포트
// 상단 근처일 때 'above' flip + top 클램프로 trigger와 떨어져 보임. 리스트가
// 많아지면 목록 max-h로 내부 스크롤.
const POPOVER_HEIGHT = 260;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

// 유형 점 색 — '오늘' 다가오는 일정과 같은 토큰.
const TYPE_DOT: Record<CompanyEventType, string> = {
  deadline: 'bg-alert',
  test: 'bg-ev-test',
  interview: 'bg-ev-interview',
  announcement: 'bg-ev-announce',
  other: 'bg-ev-other',
};

const TYPE_OPTIONS = COMPANY_EVENT_TYPES.map((t) => ({
  value: t,
  label: COMPANY_EVENT_TYPE_LABELS[t],
  icon: <span aria-hidden className={`h-1.75 w-1.75 flex-none rounded-full ${TYPE_DOT[t]}`} />,
}));

function formatDateShort(iso: string): string {
  // "2026-10-15" → "10.15 수"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const w = WEEKDAY_KO[new Date(y, mo - 1, d).getDay()];
  return `${mo}.${m[3]} ${w}`;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function EventsPopover({
  companyId,
  companyName,
  events,
  variant,
}: {
  companyId: string;
  /** 팝오버 제목 "[회사] 일정 N건"용. 없으면 "일정 N건". */
  companyName?: string;
  events: CompanyEvent[];
  variant?: 'table';
}) {
  const { isPending, onCreate, onDelete } = useCompanyEventActions(companyId);
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

  // 유형 Select의 목록은 Portal로 body에 그려져 팝오버 밖으로 잡힘 → 그 클릭은 무시.
  useOutsideClick(
    [anchorRef, popoverRef],
    (e) => {
      if ((e.target as Element).closest?.('[role="listbox"]')) return;
      setOpen(false);
    },
    open,
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const count = events.length;

  const ariaLabel = count > 0 ? `일정 ${count}건` : '일정 추가';

  return (
    <>
      {variant === 'table' ? (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
          aria-label={ariaLabel}
          aria-expanded={open}
          className={`${TABLE_ICON_BUTTON} hover:bg-row-hover ${count > 0 ? 'text-ink-soft' : 'text-icon-faint'}`}
        >
          <CalendarDays className="h-3.75 w-3.75" strokeWidth={1.8} aria-hidden />
          {count > 0 ? <span>{count}</span> : null}
        </button>
      ) : (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
          aria-label={count > 0 ? `일정 ${count}개 편집` : '일정 추가'}
          aria-expanded={open}
          className="inline-flex items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          {count > 0 ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {count}
            </span>
          ) : (
            <span className="whitespace-nowrap text-zinc-400 dark:text-zinc-600">
              —
            </span>
          )}
        </button>
      )}
      {open && pos ? (
        <Portal>
          <EventsPopoverBody
            top={pos.top}
            left={pos.left}
            anchorRef={anchorRef}
            popoverRef={popoverRef}
          >
            <EventsEditor
              companyName={companyName}
              events={events}
              isPending={isPending}
              onCreate={onCreate}
              onDelete={onDelete}
              onClose={() => setOpen(false)}
            />
          </EventsPopoverBody>
        </Portal>
      ) : null}
    </>
  );
}

type EventInput = { date: string; type: CompanyEventType; note?: string };

// 일정 추가·삭제 (즉시 저장 + refresh). 팝오버와 사이드 패널이 같이 씀.
export function useCompanyEventActions(companyId: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  function onCreate(input: EventInput) {
    startTransition(async () => {
      try {
        await createCompanyEvent({ companyId, ...input });
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return { isPending, onCreate, onDelete };
}

function EventsPopoverBody({
  top,
  left,
  anchorRef,
  popoverRef,
  children,
}: {
  top: number;
  left: number;
  anchorRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  // 일정 수에 따라 높이가 달라서 실제 높이로 버튼에 다시 붙임(아래로 잘림 방지).
  const measuredTop = useMeasuredTop(anchorRef, popoverRef, top);
  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="회사 일정"
      style={{ top: measuredTop, left, width: POPOVER_WIDTH }}
      className={`fixed z-50 ${POPOVER_CARD}`}
    >
      {children}
    </div>
  );
}

// 일정 목록 + 추가 폼 — 팝오버와 사이드 패널(CompanyDetailPanel)이 같이 씀.
// docs/design/rally-jobs-parts.html '일정'. 추가·삭제가 즉시 저장이라 버릴 초안이
// 없어서 [취소] 대신 제목 줄 ✕ (onClose 없으면 ✕도 숨김).
export function EventsEditor({
  companyName,
  events,
  isPending,
  onCreate,
  onDelete,
  onClose,
}: {
  companyName?: string;
  events: CompanyEvent[];
  isPending: boolean;
  onCreate: (input: EventInput) => void;
  onDelete: (id: string) => void;
  onClose?: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [type, setType] = useState<CompanyEventType>('interview');
  const [note, setNote] = useState('');

  function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date) return;
    onCreate({ date, type, note: note.trim() || undefined });
    setDate(todayIso());
    setType('interview');
    setNote('');
  }

  // 날짜 오름차순 (DB에서도 asc지만 안전하게 다시 정렬).
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const title = `${companyName ? `${companyName} ` : ''}일정 ${sorted.length}건`;

  return (
    <>
      <div className={`flex items-center justify-between gap-2 ${onClose ? '-my-2' : ''}`}>
        <span className={POPOVER_TITLE}>{title}</span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className={POPOVER_CLOSE}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-ink-muted">아직 등록된 일정이 없어요.</p>
      ) : (
        <ul className="flex max-h-56 flex-col overflow-y-auto">
          {sorted.map((e) => (
            <li
              key={e.id}
              className="grid grid-cols-[64px_64px_minmax(0,1fr)_auto] items-center gap-2 border-b border-divider text-sm last:border-b-0"
            >
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className={`h-1.75 w-1.75 rounded-full ${TYPE_DOT[e.type]}`} />
                {COMPANY_EVENT_TYPE_LABELS[e.type]}
              </span>
              <span className="text-ink-muted">{formatDateShort(e.date)}</span>
              <span className="truncate text-ink-soft">{e.note ?? ''}</span>
              <button
                type="button"
                onClick={() => onDelete(e.id)}
                disabled={isPending}
                aria-label="일정 삭제"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded text-ink-muted hover:text-alert disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-col gap-2 border-t border-divider pt-3">
        <div className="flex gap-2">
          <Select
            value={type}
            onChange={(v) => setType(v as CompanyEventType)}
            options={TYPE_OPTIONS}
            ariaLabel="일정 유형"
            tone="rally"
            triggerClassName="min-h-10 w-24 flex-none cursor-pointer justify-start gap-2 rounded-md border border-btn-border bg-surface px-2.5 text-sm text-ink outline-none focus:border-heading"
            triggerSuffix={<ChevronDown className="ml-auto h-3.5 w-3.5 text-ink-muted" aria-hidden />}
          />
          <input
            type="date"
            aria-label="일정 날짜"
            value={date}
            onChange={(ev) => setDate(ev.target.value)}
            required
            className={`${POPOVER_INPUT_BASE} flex-1`}
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            aria-label="일정 메모"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="예: 1차 면접"
            maxLength={200}
            className={`${POPOVER_INPUT_BASE} flex-1`}
          />
          <button type="submit" disabled={isPending || !date} className={BUTTON_PRIMARY}>
            추가
          </button>
        </div>
      </form>
    </>
  );
}
