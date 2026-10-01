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
import { Check, GripVertical, Pencil, Trash2 } from 'lucide-react';
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
import { formatTimeRange, parseTimeRangeInput } from '../../lib/routines-time';
import { dowLabel, toISODate } from '../../lib/routines-week';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AddTimeBlockRow } from './AddTimeBlockRow';
import { checkKey } from './RoutineTable';

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[];
  days: Date[];
}

const REORDER_DEBOUNCE_MS = 300;

interface EditDraft {
  label: string;
  time: string;
}

function pickInitialDate(days: Date[]): string {
  const todayIso = toISODate(new Date());
  return days.some((d) => toISODate(d) === todayIso)
    ? todayIso
    : toISODate(days[0]);
}

export function RoutineDayView({ blocks, checks, days }: Props) {
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

  // 드래그 재정렬 로컬 state. blocks prop 변경 시 render-phase diff로 재동기화.
  const [prevBlocks, setPrevBlocks] = useState(blocks);
  const [rows, setRows] = useState(blocks);
  const serverRowsRef = useRef(blocks);
  const rowsRef = useRef(rows);
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  if (prevBlocks !== blocks) {
    setPrevBlocks(blocks);
    setRows(blocks);
  }
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    serverRowsRef.current = blocks;
  }, [blocks]);

  // 편집 모드 (한 번에 한 행만).
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimeBlock | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const weekKey = toISODate(days[0]);
  const [selectedDate, setSelectedDate] = useState(() => pickInitialDate(days));
  const [weekKeyFor, setWeekKeyFor] = useState(weekKey);
  if (weekKeyFor !== weekKey) {
    setWeekKeyFor(weekKey);
    setSelectedDate(pickInitialDate(days));
  }

  async function onToggle(blockId: string, date: string) {
    const key = checkKey(blockId, date);
    const prev = isChecked(key);
    setOverlay((m) => new Map(m).set(key, !prev));
    try {
      await toggleRoutineCheck({ blockId, date, checked: !prev });
      // 형제로 렌더되는 RoutineTable(데스크톱)과 상태 sync — refresh하면 checks
      // prop이 새 array로 도착 → identity 변경 → 양쪽 overlay 자동 clear.
      router.refresh();
    } catch (err) {
      console.error(err);
      setOverlay((m) => {
        const c = new Map(m);
        c.delete(key);
        return c;
      });
    }
  }

  function beginEdit(block: TimeBlock) {
    setEditingBlockId(block.id);
    setEditDraft({
      label: block.label,
      time:
        block.startTime !== null
          ? formatTimeRange(block.startTime, block.endTime)
          : '',
    });
    setEditError(null);
  }

  function cancelEdit() {
    setEditingBlockId(null);
    setEditDraft(null);
    setEditError(null);
  }

  function saveEdit(block: TimeBlock) {
    if (!editDraft) return;
    const label = editDraft.label.trim();
    if (!label) {
      setEditError('라벨은 비어 있을 수 없어요.');
      return;
    }
    let startTime: number | null = null;
    let endTime: number | null = null;
    if (editDraft.time.trim()) {
      const parsed = parseTimeRangeInput(editDraft.time);
      if (parsed === 'invalid') {
        setEditError('시간 형식이 맞지 않아요. 예: 7:00 또는 8:30~11:30');
        return;
      }
      startTime = parsed.start;
      endTime = parsed.end;
    }
    const unchanged =
      label === block.label &&
      startTime === block.startTime &&
      endTime === block.endTime;
    if (unchanged) {
      cancelEdit();
      return;
    }
    setEditError(null);
    startTransition(async () => {
      try {
        await patchTimeBlock(block.id, { label, startTime, endTime });
        router.refresh();
        cancelEdit();
      } catch (err) {
        console.error(err);
        setEditError('저장에 실패했어요.');
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      try {
        await deleteTimeBlock(target.id);
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setDeleteTarget(null);
      }
    });
  }

  const todayIso = toISODate(new Date());
  const selectedDateObj = days.find((d) => toISODate(d) === selectedDate);
  const selectedLabel = selectedDateObj
    ? `${selectedDateObj.getMonth() + 1}/${selectedDateObj.getDate()} (${dowLabel(selectedDateObj)})`
    : selectedDate;
  const doneCount = rows.reduce(
    (n, b) => n + (isChecked(checkKey(b.id, selectedDate)) ? 1 : 0),
    0,
  );
  const nextSortOrder =
    (rows.length ? Math.max(...rows.map((b) => b.sortOrder)) : -1) + 1;

  return (
    <div className="flex flex-col gap-3 md:hidden">
      <nav className="grid grid-cols-7 gap-1" aria-label="요일 선택">
        {days.map((d) => {
          const iso = toISODate(d);
          const selected = iso === selectedDate;
          const isToday = iso === todayIso;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(iso)}
              aria-pressed={selected}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border text-xs transition-colors ${
                selected
                  ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : isToday
                    ? 'border-zinc-400 bg-white text-zinc-700 dark:border-zinc-500 dark:bg-zinc-950 dark:text-zinc-300'
                    : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400'
              }`}
            >
              <span className="text-[10px] leading-none">{dowLabel(d)}</span>
              <span className="text-sm leading-none tabular-nums">
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          {selectedLabel}
        </h2>
        <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
          {doneCount}/{rows.length} 완료
        </span>
      </div>

      {editError ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          {editError}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700">
          아직 만든 시간블록이 없어요.
        </div>
      ) : (
        <DndContext
          id={dndContextId}
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={rows.map((r) => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-center gap-3 border-b border-zinc-100 bg-zinc-50 pr-3 py-1.5 text-[11px] font-normal text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
                <span className="w-8 shrink-0" aria-hidden />
                <span className="w-16 shrink-0 text-center">시간</span>
                <span className="min-w-0 flex-1 text-center">내용</span>
                <span className="w-14 shrink-0" aria-hidden />
                <span className="w-10 shrink-0 text-center">완료</span>
              </div>
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((block) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  selectedDate={selectedDate}
                  isChecked={isChecked}
                  onToggle={onToggle}
                  isEditing={editingBlockId === block.id}
                  draft={editingBlockId === block.id ? editDraft : null}
                  isPending={isPending}
                  onBeginEdit={() => beginEdit(block)}
                  onCancelEdit={cancelEdit}
                  onDraftChange={(partial) =>
                    setEditDraft((d) => (d ? { ...d, ...partial } : d))
                  }
                  onSaveEdit={() => saveEdit(block)}
                  onDelete={() => setDeleteTarget(block)}
                />
              ))}
              </ul>
            </div>
          </SortableContext>
        </DndContext>
      )}

      <div className="px-1">
        <AddTimeBlockRow nextSortOrder={nextSortOrder} />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="시간블록 삭제"
        description={
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {deleteTarget?.label}
            </span>
            을(를) 삭제할까요? 이 블록의 체크 이력도 같이 사라져요.
          </p>
        }
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function SortableBlockItem({
  block,
  selectedDate,
  isChecked,
  onToggle,
  isEditing,
  draft,
  isPending,
  onBeginEdit,
  onCancelEdit,
  onDraftChange,
  onSaveEdit,
  onDelete,
}: {
  block: TimeBlock;
  selectedDate: string;
  isChecked: (key: string) => boolean;
  onToggle: (blockId: string, date: string) => void;
  isEditing: boolean;
  draft: EditDraft | null;
  isPending: boolean;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (partial: Partial<EditDraft>) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
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
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };

  const key = checkKey(block.id, selectedDate);
  const checked = isChecked(key);
  const timeText =
    block.startTime !== null
      ? formatTimeRange(block.startTime, block.endTime)
      : null;

  return (
    <li ref={setNodeRef} style={style} className="bg-white dark:bg-zinc-950">
      <div className="flex min-h-14 items-center gap-3 pr-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${block.label} 순서 변경 손잡이`}
          className="inline-flex h-10 w-8 shrink-0 touch-none cursor-grab items-center justify-center text-zinc-300 active:cursor-grabbing dark:text-zinc-600"
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>

        {isEditing && draft ? (
          <>
            <input
              type="text"
              value={draft.time}
              onChange={(e) => onDraftChange({ time: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              disabled={isPending}
              placeholder="7:00 또는 8:30~11:30"
              aria-label="시간"
              className="w-24 shrink-0 rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              type="text"
              value={draft.label}
              onChange={(e) => onDraftChange({ label: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              disabled={isPending}
              autoFocus
              maxLength={100}
              aria-label="라벨"
              className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <IconButton
              onClick={onSaveEdit}
              disabled={isPending}
              label="저장하고 읽기 모드로"
            >
              <Check className="h-4 w-4" aria-hidden />
            </IconButton>
          </>
        ) : (
          <>
            <span className="w-16 shrink-0 text-center text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
              {timeText ?? '—'}
            </span>
            <span className="min-w-0 flex-1 truncate text-center text-sm text-zinc-800 dark:text-zinc-200">
              {block.label}
            </span>
            <div className="flex w-14 shrink-0 items-center justify-end gap-0.5">
              <IconButton
                onClick={onBeginEdit}
                disabled={isPending}
                label={`${block.label} 편집`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </IconButton>
              <IconButton
                onClick={onDelete}
                disabled={isPending}
                label={`${block.label} 삭제`}
                danger
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </IconButton>
            </div>
            <label className="flex w-10 shrink-0 cursor-pointer items-center justify-center py-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(block.id, selectedDate)}
                aria-label={`${block.label} ${selectedDate}`}
                className="h-5 w-5 shrink-0 cursor-pointer rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
              />
            </label>
          </>
        )}
      </div>
    </li>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors disabled:opacity-40 ${
        danger
          ? 'hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300'
          : 'hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  );
}
