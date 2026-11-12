'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Minus, Plus } from 'lucide-react';
import { DEFAULT_MUSCLE_GOALS, type MuscleGoal } from '@repo/shared';
import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';
import { putMuscleGoal } from '../../lib/api';

// 부위별 주간 세트 — − / + 로 바꾸면 바로 저장(줄마다 [저장] 버튼 X).
// 연달아 누르면 마지막으로 누르고 SAVE_DELAY_MS 뒤 한 번만 보냄.
type RowState = {
  value: number;
  serverValue: number;
};

const MIN = 1;
const MAX = 50;
const SAVE_DELAY_MS = 600;
const SAVED_FLASH_MS = 2000;

export function MuscleGoalsManager({ initial }: { initial: MuscleGoal[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState<ReadonlySet<string>>(new Set());
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // 서버 값이 없는 부위(새 사용자)는 기본값으로 — 모든 부위가 늘 보이게.
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
      out[opt.key] = { value: seed, serverValue: seed };
    }
    return out;
  });

  function setSaving(key: string, on: boolean) {
    setSavingKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function save(key: string, n: number) {
    setSaving(key, true);
    try {
      const saved = await putMuscleGoal(key, n);
      // 그 사이 또 눌렀으면 value는 그대로 두고 서버 값만 갱신(다음 저장이 따라옴)
      setRows((prev) => ({
        ...prev,
        [key]: { value: prev[key].value, serverValue: saved.weeklySetTarget },
      }));
      setSavedKey(key);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => {
        setSavedKey((cur) => (cur === key ? null : cur));
      }, SAVED_FLASH_MS);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('저장하지 못했어요. 잠시 후 다시 해보세요.');
      // 저장 안 된 값은 되돌림
      setRows((prev) => ({ ...prev, [key]: { ...prev[key], value: prev[key].serverValue } }));
    } finally {
      setSaving(key, false);
    }
  }

  function step(key: string, delta: 1 | -1) {
    const row = rows[key];
    if (!row) return;
    const next = Math.min(MAX, Math.max(MIN, row.value + delta));
    if (next === row.value) return;
    setError(null);
    setSavedKey((cur) => (cur === key ? null : cur));
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], value: next } }));
    const timers = saveTimers.current;
    const prevTimer = timers.get(key);
    if (prevTimer) clearTimeout(prevTimer);
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        void save(key, next);
      }, SAVE_DELAY_MS),
    );
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
            const saving = savingKeys.has(opt.key);
            const justSaved = savedKey === opt.key && row.value === row.serverValue && !saving;
            return (
              <li key={opt.key} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="min-w-16 text-zinc-800 dark:text-zinc-200">{opt.label}</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {opt.group === 'upper' ? '상체' : '하체'}
                </span>
                <span role="status" className="ml-auto text-xs text-zinc-500 dark:text-zinc-400">
                  {saving ? (
                    '저장 중…'
                  ) : justSaved ? (
                    <span className="inline-flex items-center gap-1">
                      <Check className="h-3 w-3" aria-hidden />
                      저장됨
                    </span>
                  ) : null}
                </span>
                <div className="flex items-center">
                  <StepButton
                    label={`${opt.label} 세트 줄이기`}
                    disabled={row.value <= MIN}
                    onClick={() => step(opt.key, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </StepButton>
                  <span
                    aria-label={`${opt.label} 한 주 ${row.value}세트`}
                    className="w-14 text-center tabular-nums"
                  >
                    {row.value}세트
                  </span>
                  <StepButton
                    label={`${opt.label} 세트 늘리기`}
                    disabled={row.value >= MAX}
                    onClick={() => step(opt.key, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </StepButton>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        기본값: 등 10 · 가슴 10 · 어깨 10 · 팔 8 · 하체 12세트
      </p>
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
    >
      {children}
    </button>
  );
}
