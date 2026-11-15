'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { WORKOUT_WEEKLY_DAYS_MAX, WORKOUT_WEEKLY_DAYS_MIN } from '@repo/shared';
import { patchMyPreferences } from '../../lib/api';
import { Segment } from '../ui/Segment';
import { SaveStatus } from './lists/ListCard';

const SAVED_FLASH_MS = 3000;
const OPTIONS = Array.from(
  { length: WORKOUT_WEEKLY_DAYS_MAX - WORKOUT_WEEKLY_DAYS_MIN + 1 },
  (_, i) => WORKOUT_WEEKLY_DAYS_MIN + i,
);

// 한 주에 며칠 운동할지 — 운동 스트릭·'이번 주 운동한 날'의 기준. 고르면 바로 저장.
// 흰 카드 — 아래 '부위별 세트' 카드와 같은 모양, 상태 자리(72px)도 같은 SaveStatus.
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
    <section className="rounded-lg border border-line bg-surface px-5 py-4.5">
      <div className="mb-3.5 flex flex-col gap-1">
        <h2 className="text-[17px] font-bold text-heading">운동하는 날</h2>
        <p className="text-[13px] text-ink-muted">이만큼 운동한 주가 이어지면 운동 스트릭이 올라가요.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[15px] text-ink-soft">한 주에</span>
        <Segment
          label="한 주에 운동하는 날"
          size="lg"
          value={value}
          onChange={(n) => {
            if (n !== value) change(n);
          }}
          options={OPTIONS.map((n) => ({ value: n, label: `${n}일` }))}
        />
        <SaveStatus saving={isPending} saved={saved} />
      </div>
      {error ? <p className="mt-2 text-[13px] text-alert">{error}</p> : null}
    </section>
  );
}
