'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { upsertDayNote } from '../../lib/api';

interface Props {
  // ISO date (YYYY-MM-DD) of the visible week's Monday — used as the storage key
  // in day_notes so each week has its own retro card.
  weekStart: string;
  initialContent: string;
}

export function RoutineRetro({ weekStart, initialContent }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialContent);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [saving, startSave] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [flash, setFlash] = useState<'saved' | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when the week changes (weekStart change also brings new initialContent).
  useEffect(() => {
    setValue(initialContent);
    setSavedContent(initialContent);
    setFlash(null);
  }, [initialContent, weekStart]);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const dirty = value !== savedContent;
  const hasSavedContent = savedContent.trim().length > 0;

  function onSave() {
    if (!dirty) return;
    startSave(async () => {
      try {
        await upsertDayNote(weekStart, value);
        setSavedContent(value);
        setFlash('saved');
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(null), 1200);
      } catch (err) {
        console.error(err);
      }
    });
  }

  function onDelete() {
    startDelete(async () => {
      try {
        await upsertDayNote(weekStart, '');
        setValue('');
        setSavedContent('');
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            onSave();
          }
        }}
        placeholder="이주의 회고를 남겨보세요..."
        maxLength={2000}
        rows={8}
        className="w-full resize-y rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-zinc-500"
      />
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {flash === 'saved' ? '저장됨' : dirty ? '변경사항 있음' : ' '}
        </span>
        <div className="flex items-center gap-2">
          {hasSavedContent ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 disabled:opacity-40 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              {deleting ? '삭제 중…' : '삭제'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:cursor-default disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
