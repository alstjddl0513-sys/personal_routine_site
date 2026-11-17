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
import { Check, GripVertical, Plus, Trash2 } from 'lucide-react';
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
  createTimeBlock,
  deleteTimeBlock,
  patchTimeBlock,
  toggleRoutineCheck,
} from '../../lib/api';
import { formatTimeRange, parseTimeRangeInput } from '../../lib/routines-time';
import { dowLabel, toISODate } from '../../lib/routines-week';
import { ListConfirmDialog } from '../settings/lists/ListConfirmDialog';
import { FOCUS_RING } from '../settings/lists/ListCard';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_INPUT } from '../jobs/cells/popover-style';
import { checkKey } from './RoutineTable';
import { deleteConfirmTitle } from '../../lib/korean';

// 모바일 루틴 하루 보기(docs/design/rally-mobile-routines*.html). 데스크톱은 RoutineTable.
// 평소 모드 = 줄 아무 데나 누르면 체크(손잡이 · 🗑 · 입력 없음) / [편집] 모드 = 손잡이(순서) · 이름 고치기 · 🗑.
// 예전엔 체크 · 수정 · 손잡이가 한 줄에 붙어 체크하려다 수정이 열렸음.

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[];
  days: Date[];
}

const REORDER_DEBOUNCE_MS = 300;
const TIME_ERROR = '시간 형식이 맞지 않아요. 예: 7:00 또는 8:30~11:30';

interface EditDraft {
  label: string;
  time: string;
}
type FieldError = { message: string; field: 'label' | 'time' | null };

function pickInitialDate(days: Date[]): string {
  const todayIso = toISODate(new Date());
  return days.some((d) => toISODate(d) === todayIso) ? todayIso : toISODate(days[0]);
}

function timeText(b: TimeBlock): string | null {
  return b.startTime !== null ? formatTimeRange(b.startTime, b.endTime) : null;
}

// 입력값 → { label, startTime, endTime } 또는 오류(틀린 칸 표시용)
function parseDraft(d: EditDraft): { label: string; startTime: number | null; endTime: number | null } | FieldError {
  const label = d.label.trim();
  if (!label) return { message: '이름을 적어주세요.', field: 'label' };
  const parsed = parseTimeRangeInput(d.time);
  if (parsed === 'invalid') return { message: TIME_ERROR, field: 'time' };
  return { label, startTime: parsed.start, endTime: parsed.end };
}

export function RoutineDayView({ blocks, checks, days }: Props) {
  const router = useRouter();
  const serverCheckedSet = useMemo(() => new Set(checks.map((c) => checkKey(c.blockId, c.date))), [checks]);
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

  const [editMode, setEditMode] = useState(false);
  // 고치는 줄(한 번에 한 줄)
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [editError, setEditError] = useState<FieldError | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimeBlock | null>(null);
  const [isPending, startTransition] = useTransition();

  const dndContextId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const flushReorder = useCallback(async () => {
    const target = rowsRef.current;
    const snapshot = serverRowsRef.current;
    const serverById = new Map(snapshot.map((r) => [r.id, r] as const));
    const patches: Array<Promise<TimeBlock>> = [];
    target.forEach((row, idx) => {
      const srv = serverById.get(row.id);
      if (!srv || srv.sortOrder !== idx) patches.push(patchTimeBlock(row.id, { sortOrder: idx }));
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
      // 형제로 렌더되는 RoutineTable(데스크톱)과 상태 sync
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
    setEditDraft({ label: block.label, time: timeText(block) ?? '' });
    setEditError(null);
  }
  function cancelEdit() {
    setEditingBlockId(null);
    setEditDraft(null);
    setEditError(null);
  }
  function saveEdit(block: TimeBlock) {
    if (!editDraft) return;
    const parsed = parseDraft(editDraft);
    if ('message' in parsed) {
      setEditError(parsed);
      return;
    }
    const { label, startTime, endTime } = parsed;
    if (label === block.label && startTime === block.startTime && endTime === block.endTime) {
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
        setEditError({ message: '저장하지 못했어요. 잠시 후 다시 해보세요.', field: null });
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
        if (editingBlockId === target.id) cancelEdit();
        router.refresh();
      } catch (err) {
        console.error(err);
        setDeleteTarget(null);
      }
    });
  }

  function toggleMode() {
    if (editMode) cancelEdit();
    setEditMode((m) => !m);
  }

  const todayIso = toISODate(new Date());
  const selectedDateObj = days.find((d) => toISODate(d) === selectedDate);
  const selectedLabel = selectedDateObj
    ? `${selectedDateObj.getMonth() + 1}월 ${selectedDateObj.getDate()}일 (${dowLabel(selectedDateObj)})`
    : selectedDate;
  const doneOn = (iso: string) => rows.reduce((n, b) => n + (isChecked(checkKey(b.id, iso)) ? 1 : 0), 0);
  const doneCount = doneOn(selectedDate);
  const nextSortOrder = (rows.length ? Math.max(...rows.map((b) => b.sortOrder)) : -1) + 1;

  return (
    <div className="order-1 flex flex-col gap-3 font-plex md:hidden">
      {/* 요일 7칸 — 오늘 = 숫자 원, 고른 날 = 칸 바탕, 그날 상태 = 아래 점. 자리를 나눠서 겹쳐도 안 헷갈림 */}
      <nav
        aria-label="요일 선택"
        className="grid grid-cols-7 gap-0.5 rounded-[10px] border border-line bg-surface p-0.5"
      >
        {days.map((d) => {
          const iso = toISODate(d);
          const selected = iso === selectedDate;
          const isToday = iso === todayIso;
          const done = doneOn(iso);
          const state = rows.length > 0 && done === rows.length ? 'all' : done > 0 ? 'some' : 'none';
          const stateLabel = state === 'all' ? '다 함' : state === 'some' ? '하는 중' : '';
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelectedDate(iso)}
              aria-pressed={selected}
              aria-label={[`${d.getDate()}일 ${dowLabel(d)}요일`, isToday ? '오늘' : '', stateLabel]
                .filter(Boolean)
                .join(' · ')}
              className={`flex h-17 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg ${FOCUS_RING} ${
                selected
                  ? 'bg-chip-on-bg font-bold text-chip-on-fg shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                  : 'text-ink-muted'
              }`}
            >
              <span className="text-[11.5px] leading-none">{dowLabel(d)}</span>
              <span
                className={`inline-flex h-6.5 w-6.5 items-center justify-center rounded-full text-[15px] leading-none tabular-nums ${
                  isToday ? 'bg-button font-bold text-white dark:text-paper' : selected ? '' : 'text-ink'
                }`}
              >
                {d.getDate()}
              </span>
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  state === 'all'
                    ? 'bg-marigold'
                    : state === 'some'
                      ? 'shadow-[inset_0_0_0_1.6px_var(--rally-primary)]'
                      : ''
                }`}
              />
            </button>
          );
        })}
      </nav>

      <section aria-labelledby="day-title" className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex min-h-13 items-center justify-between gap-2 border-b border-divider pr-2 pl-4">
          <h2 id="day-title" className="text-[16.5px] font-bold text-heading">
            {selectedLabel}
          </h2>
          <span className="flex items-center gap-1">
            {!editMode ? (
              <span className="text-[13px] text-ink-muted tabular-nums">
                {doneCount}/{rows.length} 완료
              </span>
            ) : null}
            {/* 같은 버튼이 [편집] ↔ [완료] — 바꿔도 포커스가 그대로 */}
            <button
              type="button"
              onClick={toggleMode}
              aria-pressed={editMode}
              className={`inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 text-sm text-heading ${FOCUS_RING} ${
                editMode ? 'font-bold' : 'font-medium'
              }`}
            >
              {editMode ? '완료' : '편집'}
            </button>
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-7 text-center text-[15px] text-ink-soft">
            아직 만든 루틴이 없어요.
            <span className="block">아래에서 하나 추가해보세요.</span>
          </p>
        ) : editMode ? (
          <DndContext id={dndContextId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={rows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col [&>li+li]:border-t [&>li+li]:border-divider">
                {rows.map((block) => (
                  <EditRow
                    key={block.id}
                    block={block}
                    editing={editingBlockId === block.id}
                    draft={editingBlockId === block.id ? editDraft : null}
                    error={editingBlockId === block.id ? editError : null}
                    isPending={isPending}
                    onBeginEdit={() => beginEdit(block)}
                    onCancelEdit={cancelEdit}
                    onDraftChange={(partial) => setEditDraft((d) => (d ? { ...d, ...partial } : d))}
                    onSaveEdit={() => saveEdit(block)}
                    onDelete={() => setDeleteTarget(block)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <ul className="flex flex-col [&>li+li]:border-t [&>li+li]:border-divider">
            {rows.map((block) => {
              const checked = isChecked(checkKey(block.id, selectedDate));
              const time = timeText(block);
              return (
                <li key={block.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => onToggle(block.id, selectedDate)}
                    className={`flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left ${FOCUS_RING}`}
                  >
                    <span
                      aria-hidden
                      className={`inline-flex h-6 w-6 flex-none items-center justify-center rounded-md border ${
                        checked ? 'border-primary bg-primary text-white dark:text-paper' : 'border-check-off bg-surface'
                      }`}
                    >
                      {checked ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
                    </span>
                    <span
                      className={`line-clamp-2 min-w-0 flex-1 text-[15.5px] break-all ${
                        checked ? 'text-ink-faint line-through' : 'text-ink'
                      }`}
                    >
                      {block.label}
                    </span>
                    {time ? (
                      <span
                        className={`flex-none text-[13px] tabular-nums ${checked ? 'text-ink-faint' : 'text-ink-muted'}`}
                      >
                        {time}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <AddRow nextSortOrder={nextSortOrder} bordered={rows.length > 0} />
      </section>

      <ListConfirmDialog
        open={!!deleteTarget}
        title={deleteConfirmTitle(deleteTarget?.label ?? '')}
        body="이 루틴의 체크 기록도 같이 사라져요. 되돌릴 수 없어요."
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const INPUT = `${POPOVER_INPUT} min-h-11 px-3 text-[15px]`;
const INPUT_ERR = 'border-alert! focus:border-alert!';

// 편집 모드 한 줄 — [⠿] [이름 · 누르면 고치기] [시간] [🗑]. 고치는 줄은 thead 바탕으로 두 줄.
function EditRow({
  block,
  editing,
  draft,
  error,
  isPending,
  onBeginEdit,
  onCancelEdit,
  onDraftChange,
  onSaveEdit,
  onDelete,
}: {
  block: TimeBlock;
  editing: boolean;
  draft: EditDraft | null;
  error: FieldError | null;
  isPending: boolean;
  onBeginEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (partial: Partial<EditDraft>) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };
  const errId = useId();
  const time = timeText(block);
  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={`${block.label} 순서 바꾸기 — 끌거나, 누른 뒤 위 · 아래 키`}
      className={`inline-flex h-11 w-9 flex-none touch-none cursor-grab items-center justify-center rounded-md text-icon-faint active:cursor-grabbing ${FOCUS_RING}`}
    >
      <GripVertical className="h-4.5 w-4.5" aria-hidden />
    </button>
  );
  const trash = (
    <button
      type="button"
      onClick={onDelete}
      disabled={isPending}
      aria-label={`${block.label} 삭제`}
      className={`inline-flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-alert disabled:opacity-50 ${FOCUS_RING}`}
    >
      <Trash2 className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
    </button>
  );
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSaveEdit();
    if (e.key === 'Escape') onCancelEdit();
  };

  if (editing && draft) {
    return (
      <li ref={setNodeRef} style={style} className="flex flex-col gap-2 bg-thead py-2.5 pr-3 pl-1">
        <div className="flex items-center gap-1">
          {handle}
          <input
            type="text"
            value={draft.label}
            onChange={(e) => onDraftChange({ label: e.target.value })}
            onKeyDown={onKey}
            disabled={isPending}
            autoFocus
            maxLength={100}
            aria-label="루틴 이름"
            aria-invalid={error?.field === 'label' || undefined}
            aria-describedby={error ? errId : undefined}
            className={`${INPUT} ${error?.field === 'label' ? INPUT_ERR : ''}`}
          />
        </div>
        <div className="flex items-center gap-2 pl-10">
          <input
            type="text"
            value={draft.time}
            onChange={(e) => onDraftChange({ time: e.target.value })}
            onKeyDown={onKey}
            disabled={isPending}
            placeholder="7:00 또는 8:30~11:30"
            aria-label="시간"
            aria-invalid={error?.field === 'time' || undefined}
            aria-describedby={error ? errId : undefined}
            className={`${INPUT} tabular-nums ${error?.field === 'time' ? INPUT_ERR : ''}`}
          />
          <button
            type="button"
            onClick={onSaveEdit}
            disabled={isPending}
            aria-label="저장"
            className={`${BUTTON_PRIMARY} h-10 w-10 flex-none px-0!`}
          >
            <Check className="h-4.5 w-4.5" strokeWidth={2.4} aria-hidden />
          </button>
          {trash}
        </div>
        {error ? (
          <p id={errId} role="alert" className="pl-10 text-[13px] text-alert">
            {error.message}
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} className="flex min-h-14 items-center gap-1 bg-surface pr-2 pl-1">
      {handle}
      <button
        type="button"
        onClick={onBeginEdit}
        disabled={isPending}
        aria-label={`${block.label} 이름 · 시간 고치기`}
        className={`flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 text-left ${FOCUS_RING}`}
      >
        <span className="line-clamp-2 min-w-0 flex-1 text-[15.5px] break-all text-ink">{block.label}</span>
        {time ? <span className="flex-none text-[13px] text-ink-muted tabular-nums">{time}</span> : null}
      </button>
      {trash}
    </li>
  );
}

// 목록 마지막 줄 [+ 루틴 추가] → thead 바탕으로 펴짐: 이름 먼저, 아래 시간 + [추가] [취소]
function AddRow({ nextSortOrder, bordered }: { nextSortOrder: number; bordered: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({ label: '', time: '' });
  const [error, setError] = useState<FieldError | null>(null);
  const [saving, startSave] = useTransition();
  const errId = useId();

  function close() {
    setOpen(false);
    setDraft({ label: '', time: '' });
    setError(null);
  }
  function submit() {
    const parsed = parseDraft(draft);
    if ('message' in parsed) {
      setError(parsed);
      return;
    }
    setError(null);
    startSave(async () => {
      try {
        await createTimeBlock({
          label: parsed.label,
          sortOrder: nextSortOrder,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
        });
        close();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError({ message: '저장하지 못했어요. 잠시 후 다시 해보세요.', field: null });
      }
    });
  }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') close();
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-13 w-full cursor-pointer items-center gap-2 px-4 text-[15px] text-ink-muted hover:text-ink ${FOCUS_RING} ${
          bordered ? 'border-t border-divider' : ''
        }`}
      >
        <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden />
        루틴 추가
      </button>
    );
  }
  return (
    <div className={`flex flex-col gap-2 bg-thead px-4 py-3 ${bordered ? 'border-t border-divider' : ''}`}>
      <input
        type="text"
        value={draft.label}
        onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
        onKeyDown={onKey}
        disabled={saving}
        autoFocus
        maxLength={100}
        placeholder="루틴 이름 (예: 아침 운동)"
        aria-label="새 루틴 이름"
        aria-invalid={error?.field === 'label' || undefined}
        aria-describedby={error ? errId : undefined}
        className={`${INPUT} ${error?.field === 'label' ? INPUT_ERR : ''}`}
      />
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft.time}
          onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
          onKeyDown={onKey}
          disabled={saving}
          placeholder="시간 · 7:00 또는 8:30~11:30"
          aria-label="새 루틴 시간"
          aria-invalid={error?.field === 'time' || undefined}
          aria-describedby={error ? errId : undefined}
          className={`${INPUT} tabular-nums ${error?.field === 'time' ? INPUT_ERR : ''}`}
        />
        <button type="button" onClick={submit} disabled={saving} className={`${BUTTON_PRIMARY} flex-none`}>
          {saving ? '추가 중…' : '추가'}
        </button>
        <button type="button" onClick={close} disabled={saving} className={`${BUTTON_SECONDARY} flex-none`}>
          취소
        </button>
      </div>
      {error ? (
        <p id={errId} role="alert" className="text-[13px] text-alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
