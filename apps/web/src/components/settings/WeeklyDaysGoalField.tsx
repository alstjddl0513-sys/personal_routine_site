'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { WORKOUT_WEEKLY_DAYS_MAX, WORKOUT_WEEKLY_DAYS_MIN } from '@repo/shared';
import { patchMyPreferences } from '../../lib/api';
import { Segment } from '../ui/Segment';

const SAVED_FLASH_MS = 2000;
const OPTIONS = Array.from(
  { length: WORKOUT_WEEKLY_DAYS_MAX - WORKOUT_WEEKLY_DAYS_MIN + 1 },
  (_, i) => WORKOUT_WEEKLY_DAYS_MIN + i,
);

// 한 주에 며칠 운동할지 — 운동 스트릭·'이번 주 운동한 날'의 기준. 고르면 바로 저장.
// 모양은 아래 부위별 목록(zinc)과 맞춤 — 설정 개편 때 같이 토큰으로.
export function WeeklyDaysGoalField({ initial }: { initial: number }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  function change(next: number) {
    const prev = value;
    setValue(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await patchMyPreferences({ workout: { weeklyDaysTarget: next } });
        setSaved(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setSaved(false), SAVED_FLASH_MS);
        router.refresh();
      } catch (err) {
        console.error(err);
        setValue(prev);
        setError('저장하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">운동하는 날</h2>
      <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <span className="text-zinc-800 dark:text-zinc-200">한 주에</span>
        <Segment
          label="한 주에 운동하는 날"
          size="sm"
          value={value}
          onChange={(n) => {
            if (n !== value) change(n);
          }}
          options={OPTIONS.map((n) => ({ value: n, label: `${n}일` }))}
        />
        <span role="status" className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
          {isPending ? (
            '저장 중…'
          ) : saved ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3 w-3" aria-hidden />
              저장됨
            </span>
          ) : null}
        </span>
      </div>
      {error ? <p className="text-xs text-red-600 dark:text-red-400">{error}</p> : null}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        이만큼 운동한 주가 이어지면 운동 스트릭이 올라가요.
      </p>
    </section>
  );
}
