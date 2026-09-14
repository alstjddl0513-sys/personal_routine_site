'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check } from 'lucide-react';
import { DEFAULT_MUSCLE_GOALS, type MuscleGoal } from '@repo/shared';
import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';
import { putMuscleGoal } from '../../lib/api';

// Row state: each muscle key gets its own dirty/pending/saved indicator.
// Values are always kept in sync with what's rendered — the "저장" button
// is only enabled when the input differs from the last-known server value.
type RowState = {
  value: number;
  serverValue: number;
  savedAt: number; // 0 when never saved this session; used to show "저장됨"
};

export function MuscleGoalsManager({ initial }: { initial: MuscleGoal[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Merge server rows over DEFAULT_MUSCLE_GOALS so all MUSCLE_OPTIONS are
  // always rendered — new users (no rows yet) still get 5 editable rows.
  const defaultsByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of DEFAULT_MUSCLE_GOALS) m.set(d.muscleKey, d.weeklySetTarget);
    return m;
  }, []);

  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initialByKey = new Map(initial.map((g) => [g.muscleKey, g.weeklySetTarget]));
    const out: Record<string, RowState> = {};
    for (const opt of MUSCLE_OPTIONS) {
      const seed = initialByKey.get(opt.key) ?? defaultsByKey.get(opt.key) ?? 10;
      out[opt.key] = { value: seed, serverValue: seed, savedAt: 0 };
    }
    return out;
  });

  function setValue(key: string, raw: string) {
    const n = Number.parseInt(raw, 10);
    setRows((prev) => ({
      ...prev,
      [key]: { ...prev[key], value: Number.isNaN(n) ? 0 : n },
    }));
  }

  function save(key: string) {
    const row = rows[key];
    if (!row) return;
    const n = row.value;
    if (!Number.isInteger(n) || n < 1 || n > 50) {
      setError('세트 수는 1~50 사이의 정수여야 합니다.');
      return;
    }
    setError(null);
    setPendingKey(key);
    startTransition(async () => {
      try {
        const saved = await putMuscleGoal(key, n);
        setRows((prev) => ({
          ...prev,
          [key]: {
            value: saved.weeklySetTarget,
            serverValue: saved.weeklySetTarget,
            savedAt: Date.now(),
          },
        }));
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('저장에 실패했습니다.');
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {MUSCLE_OPTIONS.map((opt) => {
            const row = rows[opt.key];
            if (!row) return null;
            const dirty = row.value !== row.serverValue;
            const isPending = pendingKey === opt.key;
            const justSaved = row.savedAt > 0 && Date.now() - row.savedAt < 2000 && !dirty;
            return (
              <li
                key={opt.key}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-16 text-zinc-800 dark:text-zinc-200">
                  {opt.label}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {opt.group === 'upper' ? '상체' : '하체'}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={50}
                    value={row.value === 0 ? '' : row.value}
                    onChange={(e) => setValue(opt.key, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && dirty && !isPending) save(opt.key);
                    }}
                    disabled={isPending}
                    className="w-20 rounded border border-zinc-300 bg-white px-2 py-1 text-right text-sm tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">세트/주</span>
                  <button
                    type="button"
                    onClick={() => save(opt.key)}
                    disabled={!dirty || isPending}
                    className="min-w-16 rounded bg-zinc-900 px-3 py-1 text-xs text-white transition-colors hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  >
                    {isPending ? '저장 중…' : justSaved ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="h-3 w-3" aria-hidden />
                        저장됨
                      </span>
                    ) : '저장'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        초기값은 등 10 · 가슴 10 · 어깨 10 · 팔 8 · 다리 12로, 초보~중급 기준의 최소 유효 볼륨(MEV) 근사.
        본인 훈련 강도에 맞게 조정하세요.
      </p>
    </div>
  );
}
