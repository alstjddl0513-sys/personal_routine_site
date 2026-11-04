'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { Check, GripVertical, Trash2 } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RoutineCheck, TimeBlock } from '@repo/shared';
import {
  deleteTimeBlock,
  patchTimeBlock,
  toggleRoutineCheck,
} from '../../lib/api';
import { toISODate } from '../../lib/routines-week';
import { useOutsideClick } from '../../lib/useOutsideClick';
import { AddTimeBlockRow } from './AddTimeBlockRow';
import { TimeCell } from './TimeCell';

const REORDER_DEBOUNCE_MS = 300;

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[];
  days: Date[];
  /** 서울 기준 오늘 — 오늘 열 강조·미래 날짜 판단 */
  todayIso: string;
}

const DOW_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const DOW_LONG = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
const DAY_COUNT_TIP = '그날 체크한 루틴 수 · 전부 체크한 날만 ✓';

export function checkKey(blockId: string, date: string): string {
  return `${blockId}|${date}`;
}

// 서버 확정 상태 + 낙관 overlay. useEffect로 sync하면 새 룰 위반이라
// React 공식 "store info from previous renders" 관용구(render-time setState +
// identity compare)로 checks reference 변경 시 overlay 통째로 clear.
export function RoutineTable({ blocks, checks, days, todayIso }: Props) {
  const router = useRouter();

  const serverCheckedSet = useMemo(
    () => new Set(checks.map((c) => checkKey(c.blockId, c.date))),
    [checks],
  );
  const [overlayFor, setOverlayFor] = useState(checks);
  const [overlay, setOverlay] = useState<Map<string, boolean>>(() => new Map());
  if (overlayFor !== checks) {
    setOverlayFor(checks);
    setOverlay(new Map());
  }
  const isChecked = (key: string) => overlay.get(key) ?? serverCheckedSet.has(key);

  // 드래그 재정렬용 로컬 state. blocks prop 변경(편집/삭제가 router.refresh로 유발)
  // 시 render-phase diff로 재동기화 — useEffect 쓰면 set-state-in-effect 룰 위반.
  const [prevBlocks, setPrevBlocks] = useState(blocks);
  const [rows, setRows] = useState(blocks);
  const serverRowsRef = useRef(blocks);
  const rowsRef = useRef(rows);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (prevBlocks !== blocks) {
    setPrevBlocks(blocks);
    setRows(blocks);
  }

  // Ref 동기화는 effect로 — render 중 ref.current 할당은 react-hooks/refs 룰 위반.
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    serverRowsRef.current = blocks;
  }, [blocks]);

  const dndContextId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const flushReorder = useCallback(async () => {
    const target = rowsRef.current;
    const snapshot = serverRowsRef.current;
    const serverById = new Map(snapshot.map((r) => [r.id, r] as const));
    const patches: Array<Promise<TimeBlock>> = [];
    target.forEach((row, idx) => {
      const srv = serverById.get(row.id);
      if (!srv || srv.sortOrder !== idx) {
        patches.push(patchTimeBlock(row.id, { sortOrder: idx }));
      }
    });
    if (patches.length === 0) return;
    try {
      const updated = await Promise.all(patches);
      const updatedById = new Map(updated.map((u) => [u.id, u] as const));
      serverRowsRef.current = target.map((row, idx) => {
        const upd = updatedById.get(row.id);
        if (upd) return upd;
        const srv = serverById.get(row.id);
        return srv ?? { ...row, sortOrder: idx };
      });
    } catch (err) {
      console.error(err);
      setRows(snapshot);
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => {
      flushTimerRef.current = null;
      void flushReorder();
    }, REORDER_DEBOUNCE_MS);
  }, [flushReorder]);

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
        void flushReorder();
      }
    };
  }, [flushReorder]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = rows.findIndex((r) => r.id === active.id);
    const newIdx = rows.findIndex((r) => r.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    setRows(arrayMove(rows, oldIdx, newIdx));
    scheduleFlush();
  }

  async function onToggle(blockId: string, date: string) {
    const key = checkKey(blockId, date);
    const prev = isChecked(key);
    setOverlay((m) => new Map(m).set(key, !prev));
    try {
      await toggleRoutineCheck({ blockId, date, checked: !prev });
      // 형제로 렌더되는 RoutineDayView(모바일)와 상태 sync — refresh하면 checks
      // prop이 새 array로 도착 → identity 변경 → 양쪽 overlay 자동 clear.
      router.refresh();
    } catch (err) {
      console.error(err);
      // rollback: overlay entry 제거 → serverCheckedSet 원본 값이 다시 보임.
      setOverlay((m) => {
        const c = new Map(m);
        c.delete(key);
        return c;
      });
    }
  }

  const nextSortOrder =
    (rows.length ? Math.max(...rows.map((b) => b.sortOrder)) : -1) + 1;

  return (
    <section
      aria-labelledby="routine-week-title"
      className="hidden flex-col gap-3 md:order-2 md:flex"
    >
      <h2 id="routine-week-title" className="text-[17px] font-bold text-heading">
        이번 주 루틴
      </h2>
      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-btn-border bg-surface px-8 py-9 text-center">
          <p className="text-ink-soft">아직 만든 루틴이 없어요. 아래에서 하나 추가해보세요.</p>
          <AddTimeBlockRow nextSortOrder={nextSortOrder} variant="table" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-thead">
                  <th scope="col" className="w-7 p-0">
                    <span className="sr-only">순서</span>
                  </th>
                  <th scope="col" className="w-37.5 px-2 py-2.5 text-left text-[13px] font-semibold text-ink-muted">
                    시간
                  </th>
                  <th scope="col" className="px-2 py-2.5 text-left text-[13px] font-semibold text-ink-muted">
                    내용
                  </th>
                  {days.map((d) => (
                    <DayHeader
                      key={toISODate(d)}
                      date={d}
                      todayIso={todayIso}
                      done={rows.filter((b) => isChecked(checkKey(b.id, toISODate(d)))).length}
                      total={rows.length}
                    />
                  ))}
                  <th scope="col" className="w-11 p-0">
                    <span className="sr-only">삭제</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={rows.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {rows.map((block) => (
                    <SortableBlockRow
                      key={block.id}
                      block={block}
                      days={days}
                      todayIso={todayIso}
                      isChecked={isChecked}
                      onToggle={onToggle}
                    />
                  ))}
                </SortableContext>
                <tr>
                  <td className="p-0" />
                  <td colSpan={days.length + 3} className="px-1 pt-2 pb-2.5">
                    <AddTimeBlockRow nextSortOrder={nextSortOrder} variant="table" />
                  </td>
                </tr>
              </tbody>
            </table>
          </DndContext>
        </div>
      )}
    </section>
  );
}

// 요일 머리: 요일 / 날짜(오늘 = 원) / 그날 체크 수. '완료'(✓)는 전부 체크한 날만.
function DayHeader({
  date,
  todayIso,
  done,
  total,
}: {
  date: Date;
  todayIso: string;
  done: number;
  total: number;
}) {
  const iso = toISODate(date);
  const isToday = iso === todayIso;
  const isFuture = iso > todayIso;
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const all = total > 0 && done === total;

  const label = [
    `${date.getMonth() + 1}월 ${date.getDate()}일 ${DOW_LONG[date.getDay()]}`,
    isToday ? '오늘' : null,
    `${total}개 중 ${done}개`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <th
      scope="col"
      aria-label={label}
      className={`w-15.5 px-0.5 pt-2 pb-2.25 text-center ${isToday ? 'bg-today-col' : ''}`}
    >
      <span className="flex flex-col items-center gap-0.5">
        <span className={`text-xs font-semibold ${weekend ? 'text-ink-muted' : 'text-ink-soft'}`}>
          {DOW_SHORT[date.getDay()]}
        </span>
        {isToday ? (
          <span className="inline-flex h-6.5 w-6.5 items-center justify-center rounded-full bg-button text-[13px] font-bold text-white">
            {date.getDate()}
          </span>
        ) : (
          <span
            className={`inline-flex h-6.5 items-center text-[15px] font-semibold ${
              isFuture ? 'text-ink-muted' : 'text-ink'
            }`}
          >
            {date.getDate()}
          </span>
        )}
        <span
          title={DAY_COUNT_TIP}
          className={`text-xs ${
            all
              ? 'font-bold text-heading'
              : done === 0 && isFuture
                ? 'font-medium text-ink-faint'
                : 'font-medium text-ink-muted'
          }`}
        >
          {all ? `✓ ${done}/${total}` : done === 0 && isFuture ? '—' : `${done}/${total}`}
        </span>
      </span>
    </th>
  );
}

function SortableBlockRow({
  block,
  days,
  todayIso,
  isChecked,
  onToggle,
}: {
  block: TimeBlock;
  days: Date[];
  todayIso: string;
  isChecked: (key: string) => boolean;
  onToggle: (blockId: string, date: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-divider ${
        isDragging
          ? 'bg-surface opacity-95 shadow-[0_10px_24px_rgba(28,31,29,0.14),inset_0_0_0_1.5px_var(--rally-primary)]'
          : 'hover:bg-row-hover'
      }`}
    >
      <td className="p-0 text-center">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${block.label} 순서 바꾸기`}
          title="끌어서 순서 바꾸기"
          className="inline-flex h-10 w-7 touch-none cursor-grab items-center justify-center text-divider transition-colors group-hover:text-ink-muted focus-visible:text-ink-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      </td>
      <td className="px-1">
        <TimeCell block={block} />
      </td>
      <td className="px-1">
        <LabelCell block={block} />
      </td>
      {days.map((d) => {
        const iso = toISODate(d);
        const checked = isChecked(checkKey(block.id, iso));
        return (
          <td
            key={iso}
            className={`p-0 text-center ${iso === todayIso ? 'bg-today-col' : ''}`}
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={checked}
              aria-label={`${block.label}, ${DOW_LONG[d.getDay()]}`}
              onClick={() => onToggle(block.id, iso)}
              className="inline-flex h-10 w-10 cursor-pointer items-center justify-center"
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-[5px] ${
                  checked ? 'bg-primary' : 'border-[1.5px] border-check-off'
                }`}
              >
                {checked ? (
                  <Check className="h-3.25 w-3.25 text-white dark:text-paper" strokeWidth={3.2} aria-hidden />
                ) : null}
              </span>
            </button>
          </td>
        );
      })}
      <td className="p-0 text-center">
        <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DeleteBlockButton block={block} />
        </div>
      </td>
    </tr>
  );
}

function LabelCell({ block }: { block: TimeBlock }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(block.label);
  // 서버 label 변경 시 로컬 value sync. identity compare로 render-time.
  const [labelFor, setLabelFor] = useState(block.label);
  if (labelFor !== block.label) {
    setLabelFor(block.label);
    setValue(block.label);
  }
  const [saving, startSave] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) queueMicrotask(() => inputRef.current?.select());
  }, [editing]);

  function commit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === block.label) {
      setValue(block.label);
      setEditing(false);
      return;
    }
    startSave(async () => {
      try {
        await patchTimeBlock(block.id, { label: trimmed });
        router.refresh();
        setEditing(false);
      } catch (err) {
        console.error(err);
        setValue(block.label);
        setEditing(false);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-h-10 max-w-full cursor-pointer truncate px-1.5 text-left font-medium text-ink"
        title="눌러서 이름 고치기"
      >
        {block.label}
      </button>
    );
  }
  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        } else if (e.key === 'Escape') {
          setValue(block.label);
          setEditing(false);
        }
      }}
      disabled={saving}
      maxLength={100}
      aria-label="루틴 이름"
      className="h-9 w-full max-w-55 rounded-md border border-btn-border bg-surface px-2.5 text-sm text-ink outline-none focus:border-primary"
    />
  );
}

function DeleteBlockButton({ block }: { block: TimeBlock }) {
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
        await deleteTimeBlock(block.id);
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
        aria-label={`${block.label} 삭제`}
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-alert"
      >
        <Trash2 className="h-3.75 w-3.75" strokeWidth={1.8} aria-hidden />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={dialogRef}
            className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden />
              <h2 className="text-base font-semibold">루틴 삭제</h2>
            </div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {block.label}
              </span>
              을(를) 삭제할까요? 이 루틴의 체크 기록도 같이 사라져요.
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

