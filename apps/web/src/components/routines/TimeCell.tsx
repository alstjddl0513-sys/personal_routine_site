'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { TimeBlock } from '@repo/shared';
import { patchTimeBlock } from '../../lib/api';
import {
  DEFAULT_START_TIME,
  TIME_MAX,
  TIME_MIN,
  TIME_STEP,
  formatTimeRange,
  parseTimeRangeInput,
} from '../../lib/routines-time';

interface Range {
  start: number | null;
  end: number | null;
}

export function TimeCell({ block }: { block: TimeBlock }) {
  const router = useRouter();
  // Optimistic local value; falls back to server value between renders.
  const [local, setLocal] = useState<Range>({
    start: block.startTime,
    end: block.endTime,
  });
  const [saving, startSave] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  function save(next: Range) {
    setLocal(next);
    startSave(async () => {
      try {
        await patchTimeBlock(block.id, {
          startTime: next.start,
          endTime: next.end,
        });
        router.refresh();
      } catch (err) {
        console.error(err);
        setLocal({ start: block.startTime, end: block.endTime });
      }
    });
  }

  // Shift start (and end, if present) by delta while keeping the duration.
  // Refuses to move if either endpoint would leave [TIME_MIN, TIME_MAX].
  function shift(delta: number) {
    if (local.start === null) {
      // First interaction on an unset block: seed with default start.
      save({ start: DEFAULT_START_TIME, end: null });
      return;
    }
    const nextStart = local.start + delta;
    if (nextStart < TIME_MIN || nextStart > TIME_MAX) return;
    if (local.end !== null) {
      const nextEnd = local.end + delta;
      if (nextEnd < TIME_MIN || nextEnd > TIME_MAX) return;
      save({ start: nextStart, end: nextEnd });
    } else {
      save({ start: nextStart, end: null });
    }
  }

  function beginEdit() {
    setDraft(local.start === null ? '' : formatTimeRange(local.start, local.end));
    setEditing(true);
  }

  function commit() {
    const parsed = parseTimeRangeInput(draft);
    setEditing(false);
    if (parsed === 'invalid') return; // discard; keep prior value
    if (parsed.start !== local.start || parsed.end !== local.end) save(parsed);
  }

  const canUp =
    local.start === null
      ? true
      : local.end !== null
        ? local.end < TIME_MAX
        : local.start < TIME_MAX;
  const canDown =
    local.start === null ? false : local.start > TIME_MIN;
  const unset = local.start === null;

  return (
    <div className="relative flex items-center justify-center">
      {editing ? (
        <input
          type="text"
          inputMode="text"
          autoFocus
          value={draft}
          placeholder="예: 8:30~11:30"
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
          className="w-32 rounded border border-zinc-300 bg-white px-1 py-0.5 text-center text-sm tabular-nums font-medium text-zinc-800 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
      ) : unset ? (
        <button
          type="button"
          onClick={beginEdit}
          className="rounded px-2 py-0.5 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="시간 설정 (예: 7:00 또는 8:30~11:30)"
        >
          —
        </button>
      ) : (
        <button
          type="button"
          onClick={beginEdit}
          className="rounded px-1 text-center text-sm tabular-nums font-medium text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          title="클릭해서 입력 (예: 8:30~11:30)"
        >
          {formatTimeRange(local.start, local.end)}
        </button>
      )}
      {/* Absolute so the buttons don't push the time text off-center when hidden. */}
      {!editing && (
        <div className="pointer-events-none absolute -right-5 top-1/2 flex -translate-y-1/2 flex-col opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
          <button
            type="button"
            onClick={() => shift(TIME_STEP)}
            disabled={!canUp || saving}
            aria-label="시간 30분 증가"
            className="flex h-3.5 w-4 items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-30 dark:hover:text-zinc-200"
          >
            <ChevronUp className="h-3 w-3" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => shift(-TIME_STEP)}
            disabled={!canDown || saving}
            aria-label="시간 30분 감소"
            className="flex h-3.5 w-4 items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-30 dark:hover:text-zinc-200"
          >
            <ChevronDown className="h-3 w-3" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
