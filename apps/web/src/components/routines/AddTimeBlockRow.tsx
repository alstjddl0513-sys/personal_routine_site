'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createTimeBlock } from '../../lib/api';

// 데스크톱 루틴 표 맨 아래 — 늘 보이는 점선 입력칸(Enter · blur 저장, Esc 비우기).
// 모바일 하루 보기는 목록 마지막 줄 추가(RoutineDayView 안 AddRow).
export function AddTimeBlockRow({
  nextSortOrder,
}: {
  nextSortOrder: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [saving, startSave] = useTransition();

  // Guard against Enter → blur → submit() double-call.
  // useTransition's `saving` state can still read false during blur due to batching.
  const submittedRef = useRef(false);

  function submit() {
    if (submittedRef.current) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    submittedRef.current = true;
    startSave(async () => {
      try {
        await createTimeBlock({ label: trimmed, sortOrder: nextSortOrder });
        setValue('');
        router.refresh();
      } catch (err) {
        console.error(err);
      } finally {
        submittedRef.current = false;
      }
    });
  }

  return (
    <label className="flex w-full max-w-90 items-center gap-2 rounded-md border border-dashed border-btn-border px-2.5 text-ink-muted focus-within:border-primary">
      <Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
      <span className="sr-only">새 루틴 추가</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          } else if (e.key === 'Escape') {
            setValue('');
            e.currentTarget.blur();
          }
        }}
        onBlur={submit}
        maxLength={100}
        placeholder="루틴 이름 (예: 아침 운동)"
        disabled={saving}
        className="h-9.5 min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
      />
    </label>
  );
}
