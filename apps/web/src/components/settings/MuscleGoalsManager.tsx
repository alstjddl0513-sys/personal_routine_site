'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Minus, Plus } from 'lucide-react';
import { DEFAULT_MUSCLE_GOALS, type MuscleGoal } from '@repo/shared';
import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';
import { putMuscleGoal } from '../../lib/api';
import { FOCUS_RING, ListError, SaveStatus } from './lists/ListCard';

// 부위별 주간 세트 — − / + 로 바꾸면 바로 저장(줄마다 [저장] 버튼 X).
// 연달아 누르면 마지막으로 누르고 SAVE_DELAY_MS 뒤 한 번만 보냄.
type RowState = {
  value: number;
  serverValue: number;
};

const MIN = 1;
const MAX = 50;
const SAVE_DELAY_MS = 600;
const SAVED_FLASH_MS = 3000;

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

  const groups = [
    { key: 'upper', label: '상체' },
    { key: 'lower', label: '하체' },
  ] as const;

  return (
    <div className="flex flex-col gap-3">
      <ListError message={error} />

      <section className="rounded-lg border border-line bg-surface px-5 pt-4.5 pb-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-bold text-heading">부위별 세트</h2>
          <p className="text-[13px] text-ink-muted">무게·횟수를 모두 적은 세트만 세요.</p>
        </div>
        {groups.map((g, gi) => {
          const opts = MUSCLE_OPTIONS.filter((o) => o.group === g.key);
          if (opts.length === 0) return null;
          return (
            <div key={g.key} className={gi > 0 ? 'mt-1 border-t border-rule pt-3' : 'pt-3.5'}>
              <h3 className="text-[13px] font-bold text-ink-muted">{g.label}</h3>
              <ul className="flex flex-col [&>li]:border-b [&>li]:border-divider [&>li:last-child]:border-b-0">
                {opts.map((opt) => {
                  const row = rows[opt.key];
                  if (!row) return null;
                  const saving = savingKeys.has(opt.key);
                  const justSaved = savedKey === opt.key && row.value === row.serverValue && !saving;
                  return (
                    <li key={opt.key} className="flex min-h-14 items-center gap-3 py-2">
                      <span className="min-w-0 flex-1 text-[15px] font-semibold text-ink-strong">{opt.label}</span>
                      <div className="flex items-center">
                        <StepButton
                          label={`${opt.label} 세트 줄이기`}
                          disabled={row.value <= MIN}
                          onClick={() => step(opt.key, -1)}
                        >
                          <Minus className="h-4 w-4" aria-hidden />
                        </StepButton>
                        <span
                          aria-label={`${opt.label} 한 주 ${row.value}세트`}
                          className="w-18 text-center tabular-nums"
                        >
                          <span className="text-[17px] font-semibold text-ink-strong">{row.value}</span>
                          <span className="text-[15px] text-ink-muted">세트</span>
                        </span>
                        <StepButton
                          label={`${opt.label} 세트 늘리기`}
                          disabled={row.value >= MAX}
                          onClick={() => step(opt.key, 1)}
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                        </StepButton>
                      </div>
                      <SaveStatus saving={saving} saved={justSaved} />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>

      <p className="text-[13px] text-ink-muted">기본값: 등 10 · 가슴 10 · 어깨 10 · 팔 8 · 하체 12세트</p>
    </div>
  );
}

// 40px 테두리 아이콘 버튼 — 끝(1 · 50)에 닿으면 divider 테두리 + icon-faint
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
      className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-btn-border bg-btn-bg text-ink-soft hover:border-heading hover:text-ink disabled:cursor-default disabled:border-divider disabled:text-icon-faint disabled:hover:border-divider ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}
