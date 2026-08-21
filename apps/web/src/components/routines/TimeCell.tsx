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
  clampStep,
  formatStartTime,
} from '../../lib/routines-time';

export function TimeCell({ block }: { block: TimeBlock }) {
  const router = useRouter();
  // Optimistic local value; falls back to server value between renders.
  const [local, setLocal] = useState<number | null>(block.startTime);
  const [saving, startSave] = useTransition();

  // Keep local in sync when the server prop changes (e.g. after refresh).
  if (local !== block.startTime && !saving) {
    // no-op guard: we only sync when we're not mid-flight
  }

  function save(next: number | null) {
    setLocal(next);
    startSave(async () => {
      try {
        await patchTimeBlock(block.id, { startTime: next });
        router.refresh();
      } catch (err) {
        console.error(err);
        setLocal(block.startTime);
      }
    });
  }

  function bump(delta: number) {
    const base = local ?? DEFAULT_START_TIME;
    const next = clampStep(base + delta);
    if (next === local) return;
    save(next);
  }

  const canUp = (local ?? DEFAULT_START_TIME) < TIME_MAX;
  const canDown = (local ?? DEFAULT_START_TIME) > TIME_MIN;
  const unset = local === null;

  return (
    <div className="relative flex items-center justify-center">
      {unset ? (
        <button
          type="button"
          onClick={() => save(DEFAULT_START_TIME)}
          className="rounded px-2 py-0.5 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          title="시간 설정"
        >
          —
        </button>
      ) : (
        <span className="text-center text-sm tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
          {formatStartTime(local)}
        </span>
      )}
      {/* Absolute so the buttons don't push the time text off-center when hidden. */}
      <div className="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 flex-col opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100">
        <button
          type="button"
          onClick={() => bump(TIME_STEP)}
          disabled={!canUp || saving}
          aria-label="시간 30분 증가"
          className="flex h-3.5 w-4 items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-30 dark:hover:text-zinc-200"
        >
          <ChevronUp className="h-3 w-3" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => bump(-TIME_STEP)}
          disabled={!canDown || saving}
          aria-label="시간 30분 감소"
          className="flex h-3.5 w-4 items-center justify-center text-zinc-400 hover:text-zinc-700 disabled:opacity-30 dark:hover:text-zinc-200"
        >
          <ChevronDown className="h-3 w-3" aria-hidden />
        </button>
      </div>
    </div>
  );
}
