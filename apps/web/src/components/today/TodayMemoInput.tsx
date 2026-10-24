'use client';

import { useEffect, useRef, useState } from 'react';
import { upsertSchedulerMemo } from '../../lib/api';

const DEBOUNCE_MS = 500;
const MAX_LEN = 500; // UpsertMemoDto MaxLength

// 다가오는 일정 카드 하단 '오늘 메모'. 캘린더 그 날 칸과 같은 메모라 여기서
// 쓰면 캘린더에도 보임. 입력 멈추고 500ms 또는 포커스 빠질 때 저장, 빈
// 값이면 서버가 삭제. 여러 줄 메모가 깨지지 않게 input 대신 textarea.
export function TodayMemoInput({
  date,
  initial,
  disabled,
}: {
  date: string;
  initial: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedRef = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function save(next: string) {
    if (timer.current) clearTimeout(timer.current);
    if (next.trim() === savedRef.current.trim()) return;
    setState('saving');
    try {
      await upsertSchedulerMemo(date, next);
      savedRef.current = next;
      setState('saved');
    } catch {
      setState('error');
    }
  }

  function onChange(next: string) {
    setValue(next);
    setState('idle');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), DEBOUNCE_MS);
  }

  return (
    <div className="flex flex-col gap-1 rounded-[14px] bg-surface-muted px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="today-memo" className="text-xs font-bold text-ink-muted">
          오늘 메모
        </label>
        <span aria-live="polite" className="text-[11px] text-ink-faint">
          {state === 'saving'
            ? '저장 중…'
            : state === 'saved'
              ? '저장됨'
              : state === 'error'
                ? '저장하지 못했어요'
                : ''}
        </span>
      </div>
      <textarea
        id="today-memo"
        rows={2}
        value={value}
        maxLength={MAX_LEN}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => void save(value)}
        placeholder={disabled ? '지금은 메모를 불러오지 못했어요' : '한 줄로 남기기'}
        className="min-h-10 resize-none border-0 bg-transparent p-0 text-[15px] text-ink outline-none placeholder:text-ink-faint disabled:opacity-60"
      />
    </div>
  );
}
