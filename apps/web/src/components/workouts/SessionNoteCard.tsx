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

  // Reset only when the server-provided initialNote changes (i.e., date nav
  // or reorder-triggered refresh). Do NOT depend on sessionId — it flips
  // null→id during the same save that also sends the user's typed value.
  useEffect(() => {
    setValue(props.initialNote);
    setSaved(props.initialNote);
    setFlash(null);
  }, [props.initialNote]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const dirty = value !== saved;

  function onSave() {
    if (!dirty) return;
    startSave(async () => {
      try {
        const id = await props.ensureSession();
        await patchWorkoutSession(id, { note: value.trim() === '' ? null : value });
        setSaved(value);
        setFlash('saved');
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 1200);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
      <label className="shrink-0 text-xs text-zinc-500">컨디션</label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSave();
          }
        }}
        onBlur={onSave}
        maxLength={500}
        placeholder="오늘 컨디션 한 줄..."
        className="flex-1 rounded border border-zinc-200 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
      />
      <span className="min-w-[60px] text-right text-[10px] text-zinc-400">
        {saving ? '저장 중…' : flash === 'saved' ? '저장됨' : dirty ? '변경사항 있음' : ' '}
      </span>
    </div>
  );
}
