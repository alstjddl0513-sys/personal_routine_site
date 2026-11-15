'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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

  // 편집 중 [−][+]: 입력칸 값을 30분씩 옮김(길이 유지). 저장은 Enter·blur.
  // 범위 밖으로 나가거나 입력이 잘못됐으면 그대로 둠.
  function shiftDraft(delta: number) {
    const parsed = parseTimeRangeInput(draft);
    if (parsed === 'invalid') return;
    if (parsed.start === null) {
      setDraft(formatTimeRange(DEFAULT_START_TIME, null));
      return;
    }
    const nextStart = parsed.start + delta;
    const nextEnd = parsed.end === null ? null : parsed.end + delta;
    if (nextStart < TIME_MIN || nextStart > TIME_MAX) return;
    if (nextEnd !== null && (nextEnd < TIME_MIN || nextEnd > TIME_MAX)) return;
    setDraft(formatTimeRange(nextStart, nextEnd));
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

  const unset = local.start === null;

  if (editing) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <button
          type="button"
          // 입력칸 포커스를 안 뺏어야 blur 저장이 먼저 안 일어남.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => shiftDraft(-TIME_STEP)}
          aria-label="30분 앞당기기"
          className={`${STEP_BTN} rounded-l-md`}
        >
          −
        </button>
        <input
          type="text"
          inputMode="text"
          autoFocus
          aria-label="시간"
          value={draft}
          placeholder="8:30~11:30"
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
          className="h-9 w-21 border border-primary bg-surface px-1.5 text-center text-[13px] text-ink outline-none placeholder:text-ink-faint"
        />
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => shiftDraft(TIME_STEP)}
          aria-label="30분 미루기"
          className={`${STEP_BTN} rounded-r-md`}
        >
          +
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={beginEdit}
      disabled={saving}
      title="눌러서 시간 고치기"
      className={`min-h-10 cursor-pointer px-1.5 text-left ${unset ? 'text-ink-faint' : 'text-ink-soft'}`}
    >
      {unset ? '+ 시간' : formatTimeRange(local.start, local.end)}
    </button>
  );
}

const STEP_BTN =
  'h-9 w-7 cursor-pointer border border-btn-border bg-btn-bg text-ink-soft hover:border-heading';
