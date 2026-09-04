'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { type TimeBlock } from '@repo/shared';
import {
  createTimeBlock,
  deleteTimeBlock,
  patchTimeBlock,
} from '../../lib/api';
import { formatTimeRange, parseTimeRangeInput } from '../../lib/routines-time';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface EditState {
  label: string;
  time: string;
}

export function TimeBlocksManager({ initial }: { initial: TimeBlock[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<TimeBlock[]>(initial);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<TimeBlock | null>(null);

  function beginEdit(row: TimeBlock) {
    setEdits((prev) => ({
      ...prev,
      [row.id]: {
        label: row.label,
        time:
          row.startTime !== null
            ? formatTimeRange(row.startTime, row.endTime)
            : '',
      },
    }));
    setError(null);
  }

  function cancelEdit(id: string) {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function saveEdit(row: TimeBlock) {
    const state = edits[row.id];
    if (!state) return;
    const label = state.label.trim();
    if (!label) {
      setError('라벨은 비어 있을 수 없습니다.');
      return;
    }
    let startTime: number | null = null;
    let endTime: number | null = null;
    if (state.time.trim()) {
      const parsed = parseTimeRangeInput(state.time);
      if (parsed === 'invalid') {
        setError('시간 형식이 올바르지 않습니다. 예: 7:00 또는 8:30~11:30');
        return;
      }
      startTime = parsed.start;
      endTime = parsed.end;
    }
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchTimeBlock(row.id, {
          label,
          startTime,
          endTime,
        });
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        cancelEdit(row.id);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('수정에 실패했습니다.');
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTimeBlock(target.id);
        setRows((prev) => prev.filter((r) => r.id !== target.id));
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('삭제에 실패했습니다.');
        setDeleteTarget(null);
      }
    });
  }

  function reorder(idx: number, dir: 'up' | 'down') {
    const adjIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (adjIdx < 0 || adjIdx >= rows.length) return;
    const current = rows[idx];
    const adj = rows[adjIdx];
    const swapped = [...rows];
    swapped[idx] = adj;
    swapped[adjIdx] = current;
    setRows(swapped);
    setError(null);
    startTransition(async () => {
      try {
        await Promise.all([
          patchTimeBlock(current.id, { sortOrder: adj.sortOrder }),
          patchTimeBlock(adj.id, { sortOrder: current.sortOrder }),
        ]);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('재정렬에 실패했습니다.');
        // Revert local order.
        setRows(rows);
      }
    });
  }

  const nextSortOrder =
    (rows.length ? Math.max(...rows.map((r) => r.sortOrder)) : -1) + 1;

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-zinc-500">
            아직 등록된 시간블록이 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((row, idx) => {
              const state = edits[row.id];
              const isEditing = !!state;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={state.time}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...state, time: e.target.value },
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(row);
                          if (e.key === 'Escape') cancelEdit(row.id);
                        }}
                        disabled={isPending}
                        placeholder="예: 7:00 또는 8:30~11:30"
                        className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 text-xs tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                      <input
                        type="text"
                        value={state.label}
                        onChange={(e) =>
                          setEdits((prev) => ({
                            ...prev,
                            [row.id]: { ...state, label: e.target.value },
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(row);
                          if (e.key === 'Escape') cancelEdit(row.id);
                        }}
                        disabled={isPending}
                        autoFocus
                        maxLength={100}
                        placeholder="라벨"
                        className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </>
                  ) : (
                    <>
                      <span className="w-24 shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        {row.startTime !== null
                          ? formatTimeRange(row.startTime, row.endTime)
                          : '—'}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {row.label}
                      </span>
                    </>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    {isEditing ? (
                      <>
                        <IconButton
                          onClick={() => saveEdit(row)}
                          disabled={isPending}
                          label="저장"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          onClick={() => cancelEdit(row.id)}
                          disabled={isPending}
                          label="취소"
                        >
                          <X className="h-3.5 w-3.5" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          onClick={() => reorder(idx, 'up')}
                          disabled={isPending || idx === 0}
                          label={`${row.label} 위로`}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          onClick={() => reorder(idx, 'down')}
                          disabled={isPending || idx === rows.length - 1}
                          label={`${row.label} 아래로`}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          onClick={() => beginEdit(row)}
                          disabled={isPending}
                          label="편집"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </IconButton>
                        <IconButton
                          onClick={() => setDeleteTarget(row)}
                          disabled={isPending}
                          label="삭제"
                          danger
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <AddRow
          nextSortOrder={nextSortOrder}
          onAdd={(row) => setRows((prev) => [...prev, row])}
          onError={setError}
        />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        시간은 30분 단위. 시작만 입력하면 단일 시각(예: <code>7:00</code>),
        범위는 <code>8:30~11:30</code> 형식. 빈 값은 &quot;시간 없음&quot;.
      </p>

      <ConfirmDialog
        open={!!deleteTarget}
        title="시간블록 삭제"
        description={
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {deleteTarget?.label}
            </span>
            을(를) 삭제할까요? 이 블록의 모든 체크 이력이 함께 삭제됩니다.
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

function AddRow({
  nextSortOrder,
  onAdd,
  onError,
}: {
  nextSortOrder: number;
  onAdd: (row: TimeBlock) => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('');
  const [isPending, startTransition] = useTransition();

  function reset() {
    setLabel('');
    setTime('');
    setOpen(false);
    onError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const l = label.trim();
    if (!l) {
      onError('라벨을 입력하세요.');
      return;
    }
    let startTime: number | null = null;
    let endTime: number | null = null;
    if (time.trim()) {
      const parsed = parseTimeRangeInput(time);
      if (parsed === 'invalid') {
        onError('시간 형식이 올바르지 않습니다. 예: 7:00 또는 8:30~11:30');
        return;
      }
      startTime = parsed.start;
      endTime = parsed.end;
    }
    onError(null);
    startTransition(async () => {
      try {
        const created = await createTimeBlock({
          label: l,
          sortOrder: nextSortOrder,
          startTime,
          endTime,
        });
        onAdd(created);
        reset();
        router.refresh();
      } catch (err) {
        console.error(err);
        onError('추가에 실패했습니다.');
      }
    });
  }

  if (!open) {
    return (
      <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          시간블록 추가
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 border-t border-zinc-100 p-2 dark:border-zinc-800"
    >
      <input
        type="text"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        placeholder="시간 (선택)"
        disabled={isPending}
        className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-xs tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="라벨 (예: 아침 운동)"
        disabled={isPending}
        autoFocus
        maxLength={100}
        className="min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={isPending || !label}
        className="rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? '추가 중…' : '추가'}
      </button>
      <button
        type="button"
        onClick={reset}
        disabled={isPending}
        className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      >
        취소
      </button>
    </form>
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
