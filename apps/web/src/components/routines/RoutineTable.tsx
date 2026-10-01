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
import { GripVertical, Trash2, X } from 'lucide-react';
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
import { dowLabel, toISODate } from '../../lib/routines-week';
import { useOutsideClick } from '../../lib/useOutsideClick';
import { AddTimeBlockRow } from './AddTimeBlockRow';
import { TimeCell } from './TimeCell';

const REORDER_DEBOUNCE_MS = 300;

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[];
  days: Date[];
}

export function checkKey(blockId: string, date: string): string {
  return `${blockId}|${date}`;
}

// 서버 확정 상태 + 낙관 overlay. useEffect로 sync하면 새 룰 위반이라
// React 공식 "store info from previous renders" 관용구(render-time setState +
// identity compare)로 checks reference 변경 시 overlay 통째로 clear.
export function RoutineTable({ blocks, checks, days }: Props) {
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
    <div className="hidden overflow-x-auto rounded-md border border-zinc-200 md:block dark:border-zinc-800">
      <DndContext
        id={dndContextId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
            <tr>
              <th className="w-8 px-1 py-2 align-middle" aria-label="순서 손잡이" />
              <th className="w-24 px-2 py-2 text-center align-middle font-normal">시간</th>
              <th className="w-48 px-3 py-2 text-center align-middle font-normal">내용</th>
              {days.map((d) => (
                <th
                  key={toISODate(d)}
                  className="min-w-16 px-2 py-2 text-center align-middle text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-200"
                >
                  {d.getDate()} ({dowLabel(d)})
                </th>
              ))}
              <th className="w-32 px-3 py-2 text-center align-middle font-normal">주간 달성률</th>
              <th className="w-16 px-2 py-2 align-middle" aria-label="액션" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={days.length + 5}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  아직 만든 시간블록이 없어요. 아래에서 하나 추가해보세요.
                </td>
              </tr>
            ) : (
              <SortableContext
                items={rows.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                {rows.map((block) => (
                  <SortableBlockRow
                    key={block.id}
                    block={block}
                    days={days}
                    isChecked={isChecked}
                    onToggle={onToggle}
                  />
                ))}
              </SortableContext>
            )}
            <tr>
              <td colSpan={days.length + 5} className="p-2">
                <AddTimeBlockRow nextSortOrder={nextSortOrder} />
              </td>
            </tr>
          </tbody>
        </table>
      </DndContext>
    </div>
  );
}

function SortableBlockRow({
  block,
  days,
  isChecked,
  onToggle,
}: {
  block: TimeBlock;
  days: Date[];
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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="group">
      <td className="w-8 px-1 py-2 align-middle">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${block.label} 순서 변경 손잡이`}
          className="inline-flex h-6 w-6 touch-none cursor-grab items-center justify-center rounded text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-100 hover:text-zinc-500 focus:opacity-100 active:cursor-grabbing group-hover:opacity-100 group-focus-within:opacity-100 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-400"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      </td>
      <td className="px-2 py-2 align-middle">
        <TimeCell block={block} />
      </td>
      <td className="px-3 py-2 text-center align-middle">
        <LabelCell block={block} />
      </td>
      {days.map((d) => {
        const iso = toISODate(d);
        const key = checkKey(block.id, iso);
        const checked = isChecked(key);
        return (
          <td key={iso} className="px-2 py-2 text-center align-middle">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(block.id, iso)}
              aria-label={`${block.label} ${iso}`}
              className="h-4 w-4 cursor-pointer rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
            />
          </td>
        );
      })}
      <td className="w-32 px-3 py-2 align-middle">
        <ProgressBar
          checkedCount={days.reduce(
            (n, d) => n + (isChecked(checkKey(block.id, toISODate(d))) ? 1 : 0),
            0,
          )}
          total={days.length}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <div className="flex items-center justify-end opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <DeleteBlockButton block={block} />
        </div>
      </td>
    </tr>
  );
}

function ProgressBar({ checkedCount, total }: { checkedCount: number; total: number }) {
  const pct = total > 0 ? (checkedCount / total) * 100 : 0;
  const full = checkedCount === total && total > 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-200 ${
            full ? 'bg-emerald-500' : 'bg-emerald-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-[10px] tabular-nums text-zinc-500 dark:text-zinc-400">
        {checkedCount}/{total}
      </span>
    </div>
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
        className="w-full truncate rounded px-1 py-0.5 text-center text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="클릭해서 편집"
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
      className="w-full rounded border border-zinc-400 bg-white px-1.5 py-0.5 text-center text-sm outline-none focus:border-zinc-600 dark:border-zinc-500 dark:bg-zinc-950"
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
        className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
      >
        <X className="h-4 w-4" aria-hidden />
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
              <h2 className="text-base font-semibold">시간블록 삭제</h2>
            </div>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {block.label}
              </span>
              을(를) 삭제할까요? 이 블록의 체크 이력도 같이 사라져요.
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

