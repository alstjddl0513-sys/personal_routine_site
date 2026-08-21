'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createTimeBlock } from '../../lib/api';

export function AddTimeBlockRow({ nextSortOrder }: { nextSortOrder: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, startSave] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) queueMicrotask(() => inputRef.current?.focus());
  }, [editing]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed) {
      setEditing(false);
      return;
    }
    startSave(async () => {
      try {
        await createTimeBlock({ label: trimmed, sortOrder: nextSortOrder });
        setValue('');
        setEditing(false);
        router.refresh();
      } catch (err) {
        console.error(err);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        블록 추가
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            setValue('');
            setEditing(false);
          }
        }}
        onBlur={submit}
        maxLength={100}
        placeholder="블록 이름 (예: 아침 운동)"
        disabled={saving}
        className="w-64 rounded border border-zinc-400 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-600 dark:border-zinc-500 dark:bg-zinc-950"
      />
      <span className="text-xs text-zinc-400">Enter 저장 · Esc 취소</span>
    </div>
  );
}
