'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import type { ApplicationStatus } from '@repo/shared';
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
  POPOVER_CHECKBOX_LABEL,
  POPOVER_EDGE_MARGIN,
  POPOVER_INPUT_BASE,
  POPOVER_TITLE,
} from './popover-style';
import { TABLE_TRIGGER } from './table-style';

// 시간 입력("오후 06:00" + 시계 아이콘)이 잘리지 않게 시간 칸 폭을 고정하고 날짜가 나머지.
const POPOVER_WIDTH = 360;
const POPOVER_HEIGHT = 250;
const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
// 날짜만 고르고 시간을 비우면 그날 끝으로.
const DEFAULT_TIME = '23:59';

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

// 오늘 0시 기준 달력 일수 차이 (지난 마감은 음수).
function daysUntil(d: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function ddayLabel(days: number): string {
  if (days < 0) return '마감됨';
  if (days === 0) return '오늘';
  if (days === 1) return '내일';
  return `D-${days}`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

// 전형이 끝난 회사 — 마감이 다가와도 할 일이 없어서 강조 안 함.
const CLOSED_STATUSES: readonly ApplicationStatus[] = [
  'document_failed',
  'interview_1_failed',
  'interview_2_failed',
  'final_failed',
  'final_passed',
  'withdrawn',
];

export function DeadlinePopover({
  id,
  value,
  isRolling,
  variant,
  status,
}: {
  id: string;
  value: string | null;
  isRolling: boolean;
  variant?: 'table';
  /** 표에서 마감 강조 여부 판단용 (끝난 회사는 강조 안 함). */
  status?: ApplicationStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [currentIso, setCurrentIso] = useOptimistic(value);
  const [currentRolling, setCurrentRolling] = useOptimistic(isRolling);
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

  const ariaLabel = currentRolling || currentIso ? '마감일 편집' : '마감일 추가';

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
          className={`${TABLE_TRIGGER} gap-2 whitespace-nowrap`}
        >
          <TableDeadline
            iso={currentIso}
            rolling={currentRolling}
            closed={status !== undefined && CLOSED_STATUSES.includes(status)}
          />
        </button>
      ) : (
        <button
          ref={anchorRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={isPending}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          aria-label={ariaLabel}
          aria-expanded={open}
        >
          {currentRolling ? (
            <span className="inline-flex items-center whitespace-nowrap rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              상시채용
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
      )}
      {open && pos ? (
        <Portal>
          <DeadlinePopoverBody
            initialIso={currentIso}
            initialRolling={currentRolling}
            hasCurrent={currentIso !== null || currentRolling}
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

// 표 셀 표시: "D-2  10.26 월 23:59". 진행 중인 회사만 오늘·내일 마감색, D-2~3
// 호박색으로 강조(날짜는 회색 유지). 지난 건 "마감됨".
// 빈 칸은 평소 흐린 "—", 행 hover·포커스 때만 "+ 추가" (100행 넘게 반복되면 시끄러워서).
function TableDeadline({
  iso,
  rolling,
  closed,
}: {
  iso: string | null;
  rolling: boolean;
  closed: boolean;
}) {
  if (rolling) return <span className="text-sm text-ink-muted">상시채용</span>;
  const d = parseTimestamp(iso);
  if (!d) {
    return (
      <>
        <span className="text-icon-faint group-focus-within:hidden group-hover:hidden">—</span>
        <span className="hidden text-[13px] text-ink-muted group-focus-within:inline group-hover:inline">
          + 추가
        </span>
      </>
    );
  }
  const days = daysUntil(d);
  const tone =
    days < 0
      ? 'text-ink-muted'
      : closed
        ? 'text-ink'
        : days <= 1
          ? 'text-alert'
          : days <= 3
            ? 'text-warn'
            : 'text-ink';
  return (
    <>
      <span className={`min-w-8 text-left text-sm font-semibold ${tone}`}>{ddayLabel(days)}</span>
      <span className="text-[13px] text-ink-muted">
        {`${d.getMonth() + 1}.${pad2(d.getDate())} ${WEEKDAY_KO[d.getDay()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`}
      </span>
    </>
  );
}

interface BodyProps {
  initialIso: string | null;
  initialRolling: boolean;
  hasCurrent: boolean;
  top: number;
  left: number;
  anchorRef: RefObject<HTMLButtonElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  onCommit: (nextIso: string | null, nextRolling: boolean) => void;
  onCancel: () => void;
}

// docs/design/rally-jobs-parts.html '마감일'.
function DeadlinePopoverBody({
  initialIso,
  initialRolling,
  hasCurrent,
  top,
  left,
  anchorRef,
  popoverRef,
  onCommit,
  onCancel,
}: BodyProps) {
  // 미리보기 줄 유무로 높이가 달라서 실제 높이로 버튼에 다시 붙임.
  const measuredTop = useMeasuredTop(anchorRef, popoverRef, top);
  const initial = isoToLocalInput(initialIso);
  const [draftDate, setDraftDate] = useState(initial.slice(0, 10));
  const [draftTime, setDraftTime] = useState(initial.slice(11, 16));
  const [draftRolling, setDraftRolling] = useState(initialRolling);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  const draftIso = draftDate
    ? localInputToIso(`${draftDate}T${draftTime || DEFAULT_TIME}`)
    : null;

  function save() {
    onCommit(draftIso, draftRolling);
  }

  function onEnter(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  }

  const preview = draftIso && !draftRolling ? new Date(draftIso) : null;

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
      <span className={POPOVER_TITLE}>마감일</span>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="date"
          aria-label="마감 날짜"
          value={draftRolling ? '' : draftDate}
          disabled={draftRolling}
          min="2020-01-01"
          max="2099-12-31"
          onChange={(e) => setDraftDate(e.target.value)}
          onKeyDown={onEnter}
          className={`${POPOVER_INPUT_BASE} flex-1`}
        />
        <input
          type="time"
          aria-label="마감 시간"
          value={draftRolling ? '' : draftTime}
          disabled={draftRolling}
          onChange={(e) => setDraftTime(e.target.value)}
          onKeyDown={onEnter}
          className={`${POPOVER_INPUT_BASE} w-36 flex-none`}
        />
      </div>
      {preview ? (
        <span className="text-[13px] text-ink-muted">
          {`${preview.getMonth() + 1}월 ${preview.getDate()}일 ${WEEKDAY_KO[preview.getDay()]}요일 ${pad2(preview.getHours())}:${pad2(preview.getMinutes())} · `}
          <strong className="font-semibold text-ink">{ddayLabel(daysUntil(preview))}</strong>
        </span>
      ) : null}
      <label className={POPOVER_CHECKBOX_LABEL}>
        <input
          type="checkbox"
          checked={draftRolling}
          onChange={(e) => setDraftRolling(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        상시채용 (마감일 없음)
      </label>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onCommit(null, false)}
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
