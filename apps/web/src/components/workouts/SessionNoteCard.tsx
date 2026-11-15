'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { patchWorkoutSession } from '../../lib/api';

interface Props {
  initialNote: string;
  ensureSession: () => Promise<string>;
}

export function SessionNoteCard(props: Props) {
  const [value, setValue] = useState(props.initialNote);
  const [saved, setSaved] = useState(props.initialNote);
  const [saving, startSave] = useTransition();
  const [flash, setFlash] = useState<'saved' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failed, setFailed] = useState(false);
  // 입력을 멈추고 1초 뒤 자동 저장.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset only when the server-provided initialNote changes (i.e., date nav
  // or reorder-triggered refresh). Keyed on sessionId at the parent would
  // unmount mid-save (null→id flip happens during the save that submits the
  // user's typed value), so we snap state in render via the "adjust state on
  // prop change" pattern (react.dev/learn/you-might-not-need-an-effect).
  const [prevInitial, setPrevInitial] = useState(props.initialNote);
  if (props.initialNote !== prevInitial) {
    setPrevInitial(props.initialNote);
    setValue(props.initialNote);
    setSaved(props.initialNote);
    setFlash(null);
  }

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  const dirty = value !== saved;

  function onSave(next: string = value) {
    if (debounce.current) clearTimeout(debounce.current);
    if (next === saved) return;
    startSave(async () => {
      try {
        const id = await props.ensureSession();
        await patchWorkoutSession(id, { note: next.trim() === '' ? null : next });
        setSaved(next);
        setFailed(false);
        setFlash('saved');
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 1200);
      } catch (err) {
        console.error(err);
        setFailed(true);
      }
    });
  }

  function onChange(next: string) {
    setValue(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onSave(next), 1000);
  }

  // 입력칸은 본문 오른쪽 끝까지(flex-1), 저장 상태는 칸 안 오른쪽 — 칸 밖에 두면 폭이 들쭉날쭉.
  // 오른쪽 여백은 가장 긴 상태("● 변경사항 있음")가 글자와 안 겹치는 폭.
  return (
    <div className="flex min-w-0 flex-[1_1_320px] items-center gap-2.5">
      <label htmlFor="session-note" className="shrink-0 text-sm font-semibold text-ink-soft">
        컨디션
      </label>
      <span className="relative flex min-w-0 flex-1">
        <input
          id="session-note"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSave();
            }
          }}
          onBlur={() => onSave()}
          maxLength={500}
          placeholder="오늘 컨디션 한 줄..."
          className="min-h-11 w-full min-w-0 rounded-md border border-btn-border bg-surface pr-26 pl-3 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-heading md:min-h-10"
        />
        <span
          role="status"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px]"
        >
          {saving ? (
            <span className="text-ink-faint">저장 중…</span>
          ) : dirty || failed ? (
            <span className="inline-flex items-center gap-1.5 text-warn">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warn" />
              변경사항 있음
            </span>
          ) : flash === 'saved' ? (
            <span className="text-ink-faint">저장됨</span>
          ) : null}
        </span>
      </span>
    </div>
  );
}
