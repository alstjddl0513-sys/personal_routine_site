'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { WorkoutSet } from '@repo/shared';
import { batchWorkoutSets, type WorkoutSetInput } from '../../lib/api';

interface Row {
  setNumber: number;
  weight: string;
  reps: string;
  rir: string;
}

interface Props {
  exerciseId: string;
  defaultSets: number;
  existingSets: WorkoutSet[];
  ensureSession: () => Promise<string>;
  showRir: boolean;
}

function initRows(defaultSets: number, existing: WorkoutSet[]): Row[] {
  const highest = existing.reduce((m, s) => Math.max(m, s.setNumber), 0);
  const n = Math.max(defaultSets, highest);
  const rows: Row[] = [];
  for (let i = 1; i <= n; i++) {
    const s = existing.find((x) => x.setNumber === i);
    rows.push({
      setNumber: i,
      weight: s?.weightKg != null ? String(Number(s.weightKg)) : '',
      reps: s?.reps != null ? String(s.reps) : '',
      rir: s?.rir != null ? String(s.rir) : '',
    });
  }
  return rows;
}

function rowsSignature(rows: Row[]): string {
  return rows.map((r) => `${r.setNumber}|${r.weight}|${r.reps}|${r.rir}`).join(';');
}

export function SetInputs(props: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => initRows(props.defaultSets, props.existingSets));
  const lastSavedRef = useRef<string>(rowsSignature(rows));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resync when server props change (reorder / another card's save →
  // router.refresh re-fetches everything). Guard against wiping in-flight
  // typing: if the local sig differs from lastSaved, the user is mid-edit and
  // we'd otherwise erase what they just typed in the next field.
  // Date/session change is handled by the parent's `key` remount, not here.
  useEffect(() => {
    const currentSig = rowsSignature(rows);
    if (currentSig !== lastSavedRef.current) return;
    const next = initRows(props.defaultSets, props.existingSets);
    setRows(next);
    lastSavedRef.current = rowsSignature(next);
    setError(null);
    // rows intentionally excluded — this effect responds to server prop
    // changes; we peek at rows via closure only to decide whether to apply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.defaultSets, props.existingSets]);

  function update(idx: number, field: 'weight' | 'reps' | 'rir', value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  async function commit() {
    const sig = rowsSignature(rows);
    if (sig === lastSavedRef.current) return;
    setError(null);
    setSaving(true);
    try {
      const sessionId = await props.ensureSession();
      const payload: WorkoutSetInput[] = rows
        .map((r) => ({
          setNumber: r.setNumber,
          weightKg: r.weight === '' ? null : Number(r.weight),
          reps: r.reps === '' ? null : Number(r.reps),
          rir: r.rir === '' ? null : Number(r.rir),
        }))
        .filter((s) => s.weightKg != null || s.reps != null || s.rir != null);

      for (const s of payload) {
        if (s.weightKg != null && !Number.isFinite(s.weightKg)) {
          throw new Error('무게는 숫자여야 합니다');
        }
        if (s.reps != null && !Number.isInteger(s.reps)) {
          throw new Error('횟수는 정수여야 합니다');
        }
        if (s.rir != null && !Number.isInteger(s.rir)) {
          throw new Error('RIR은 정수여야 합니다');
        }
      }

      await batchWorkoutSets({
        sessionId,
        exerciseId: props.exerciseId,
        sets: payload,
      });
      lastSavedRef.current = sig;
      // Backend may auto-delete the session when it ends up empty (no sets, no
      // note). Refresh so the parent re-fetches — otherwise UI still points to
      // a session id that no longer exists.
      router.refresh();
    } catch (err) {
      console.error(err);
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const gridCols = props.showRir ? '20px 1fr 1fr 1fr' : '20px 1fr 1fr';

  return (
    <div className="flex flex-col gap-1">
      <div
        className="grid items-center gap-2 text-[10px] font-medium text-zinc-500"
        style={{ gridTemplateColumns: gridCols }}
      >
        <span />
        <span className="text-center">무게(kg)</span>
        <span className="text-center">횟수</span>
        {props.showRir ? <span className="text-center">RIR</span> : null}
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.setNumber}
          className="grid items-center gap-2"
          style={{ gridTemplateColumns: gridCols }}
        >
          <span className="text-center text-[11px] tabular-nums text-zinc-400">
            {row.setNumber}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            value={row.weight}
            onChange={(e) => update(idx, 'weight', e.target.value)}
            onBlur={commit}
            className="min-h-11 w-full rounded border border-zinc-200 bg-white px-2 py-2 text-center text-base tabular-nums outline-none focus:border-zinc-500 md:min-h-0 md:py-1 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
            aria-label={`세트 ${row.setNumber} 무게`}
          />
          <input
            type="number"
            inputMode="numeric"
            step="1"
            min={0}
            value={row.reps}
            onChange={(e) => update(idx, 'reps', e.target.value)}
            onBlur={commit}
            className="min-h-11 w-full rounded border border-zinc-200 bg-white px-2 py-2 text-center text-base tabular-nums outline-none focus:border-zinc-500 md:min-h-0 md:py-1 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
            aria-label={`세트 ${row.setNumber} 횟수`}
          />
          {props.showRir ? (
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min={0}
              max={10}
              value={row.rir}
              onChange={(e) => update(idx, 'rir', e.target.value)}
              onBlur={commit}
              className="min-h-11 w-full rounded border border-zinc-200 bg-white px-2 py-2 text-center text-base tabular-nums outline-none focus:border-zinc-500 md:min-h-0 md:py-1 md:text-sm dark:border-zinc-700 dark:bg-zinc-950"
              aria-label={`세트 ${row.setNumber} RIR`}
            />
          ) : null}
        </div>
      ))}
      <div className="min-h-[14px] text-right text-[10px]">
        {saving ? (
          <span className="text-zinc-400">저장 중…</span>
        ) : error ? (
          <span className="text-rose-500">저장 실패: {error}</span>
        ) : null}
      </div>
    </div>
  );
}
