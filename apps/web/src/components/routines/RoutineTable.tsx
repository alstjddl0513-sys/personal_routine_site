'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
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

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[];
  days: Date[];
}

export function checkKey(blockId: string, date: string): string {
  return `${blockId}|${date}`;
}

export function RoutineTable({ blocks, checks, days }: Props) {
  const router = useRouter();

  const [checkedSet, setCheckedSet] = useState<Set<string>>(
    () => new Set(checks.map((c) => checkKey(c.blockId, c.date))),
  );
  // Re-sync when server data changes (after router.refresh, week nav, etc.)
  useEffect(() => {
    setCheckedSet(new Set(checks.map((c) => checkKey(c.blockId, c.date))));
  }, [checks]);

  async function onToggle(blockId: string, date: string) {
    const key = checkKey(blockId, date);
    const wasChecked = checkedSet.has(key);
    const next = new Set(checkedSet);
    if (wasChecked) next.delete(key);
    else next.add(key);
    setCheckedSet(next);
    try {
      await toggleRoutineCheck({ blockId, date, checked: !wasChecked });
    } catch (err) {
      console.error(err);
      // Revert on failure
      setCheckedSet(checkedSet);
    }
  }

  return (
    <div className="hidden overflow-x-auto rounded-md border border-zinc-200 md:block dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          <tr>
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
            <th className="w-32 px-3 py-2 text-center align-middle font-normal">달성률</th>
            <th className="w-24 px-2 py-2 align-middle" aria-label="액션" />
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {blocks.length === 0 ? (
            <tr>
              <td
                colSpan={days.length + 4}
                className="px-4 py-8 text-center text-sm text-zinc-500"
              >
                아직 등록된 시간블록이 없습니다. 아래에서 추가하세요.
              </td>
            </tr>
          ) : (
            blocks.map((block, idx) => (
              <BlockRow
                key={block.id}
                block={block}
                days={days}
                checkedSet={checkedSet}
                onToggle={onToggle}
                canMoveUp={idx > 0}
                canMoveDown={idx < blocks.length - 1}
                onReorder={async (dir) => {
                  const adjIdx = dir === 'up' ? idx - 1 : idx + 1;
                  const adj = blocks[adjIdx];
                  if (!adj) return;
                  await Promise.all([
                    patchTimeBlock(block.id, { sortOrder: adj.sortOrder }),
                    patchTimeBlock(adj.id, { sortOrder: block.sortOrder }),
                  ]);
                  router.refresh();
                }}
              />
            ))
          )}
          <tr>
            <td colSpan={days.length + 4} className="p-2">
              <AddTimeBlockRow nextSortOrder={
                (blocks.length ? Math.max(...blocks.map((b) => b.sortOrder)) : -1) + 1
              } />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function BlockRow({
  block,
  days,
  checkedSet,
  onToggle,
  canMoveUp,
  canMoveDown,
  onReorder,
}: {
  block: TimeBlock;
  days: Date[];
  checkedSet: Set<string>;
  onToggle: (blockId: string, date: string) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onReorder: (dir: 'up' | 'down') => Promise<void>;
}) {
  const [reordering, startReorder] = useTransition();
  return (
    <tr className="group">
      <td className="px-2 py-2 align-middle">
        <TimeCell block={block} />
      </td>
      <td className="px-3 py-2 text-center align-middle">
        <LabelCell block={block} />
      </td>
      {days.map((d) => {
        const iso = toISODate(d);
        const key = checkKey(block.id, iso);
        const checked = checkedSet.has(key);
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
            (n, d) => n + (checkedSet.has(checkKey(block.id, toISODate(d))) ? 1 : 0),
            0,
          )}
          total={days.length}
        />
      </td>
      <td className="px-2 py-2 align-middle">
        <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => startReorder(() => onReorder('up'))}
            disabled={!canMoveUp || reordering}
            aria-label={`${block.label} 위로`}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronUp className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => startReorder(() => onReorder('down'))}
            disabled={!canMoveDown || reordering}
            aria-label={`${block.label} 아래로`}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
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
  const [saving, startSave] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(block.label);
  }, [block.label]);

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
              을(를) 삭제할까요? 관련된 모든 체크 이력도 함께 삭제됩니다.
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

