'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  Exercise,
  ExerciseStatsPR,
  PreviousWorkout,
  WorkoutSet,
} from '@repo/shared';
import { SetInputs } from './SetInputs';
import { muscleLabel } from '../../lib/muscle-groups';

interface Props {
  exercise: Exercise;
  existingSets: WorkoutSet[];
  previous: PreviousWorkout | null;
  pr: ExerciseStatsPR | null;
  ensureSession: () => Promise<string>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: 'up' | 'down') => Promise<void>;
}

function formatSet(s: { weightKg: string | null; reps: number | null }): string {
  const w = s.weightKg != null ? Number(s.weightKg) : null;
  const r = s.reps;
  if (w == null && r == null) return '-';
  if (w == null) return `${r}회`;
  if (r == null) return `${w}kg`;
  return `${w}kg × ${r}`;
}

function formatPrev(prev: PreviousWorkout | null): { date: string; rendered: string } | null {
  if (!prev || prev.sets.length === 0) return null;
  const rendered = prev.sets
    .slice()
    .sort((a, b) => a.setNumber - b.setNumber)
    .map(formatSet)
    .join(', ');
  return { date: prev.date, rendered };
}

export function ExerciseCard(props: Props) {
  const [reordering, startReorder] = useTransition();
  const [showRir, setShowRir] = useState(props.existingSets.some((s) => s.rir != null));
  // Mobile-only collapse; desktop always shows body via `md:block` override.
  const [collapsed, setCollapsed] = useState(false);
  const prev = formatPrev(props.previous);
  const bodyHiddenClass = collapsed ? 'hidden md:block' : '';

  return (
    <div className="group flex flex-col rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">{props.exercise.name}</div>
          <div className="text-[11px] text-zinc-500">
            {muscleLabel(props.exercise.targetMuscle) ?? '-'} · 목표 {props.exercise.repMin}~{props.exercise.repMax}회
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="hidden items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 md:flex">
            <button
              type="button"
              onClick={() => startReorder(() => props.onMove('up'))}
              disabled={!props.canMoveUp || reordering}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label={`${props.exercise.name} 위로`}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => startReorder(() => props.onMove('down'))}
              disabled={!props.canMoveDown || reordering}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
              aria-label={`${props.exercise.name} 아래로`}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? '펼치기' : '접기'}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 md:hidden dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className={bodyHiddenClass}>
      {prev ? (
        <div className="mb-1 rounded bg-zinc-50 px-2 py-1.5 text-[11px] text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
          <span className="font-medium">지난번</span>
          <span className="ml-1 text-zinc-400">({prev.date})</span>: {prev.rendered}
        </div>
      ) : (
        <div className="mb-1 rounded bg-zinc-50 px-2 py-1.5 text-[11px] italic text-zinc-400 dark:bg-zinc-900">
          지난 기록 없음
        </div>
      )}

      {props.pr ? (
        <div className="mb-2 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
          <span className="rounded bg-amber-100 px-1 py-0.5 font-semibold dark:bg-amber-950/50">
            PR
          </span>
          <span>
            {Number(props.pr.weightKg)}kg
            {props.pr.reps != null ? ` × ${props.pr.reps}` : ''}
            <span className="ml-1 text-zinc-400">({props.pr.sessionDate})</span>
          </span>
        </div>
      ) : null}

      <SetInputs
        exerciseId={props.exercise.id}
        defaultSets={props.exercise.defaultSets}
        existingSets={props.existingSets}
        ensureSession={props.ensureSession}
        showRir={showRir}
      />

      <div className="mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => setShowRir((v) => !v)}
          className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {showRir ? '− RIR 숨기기' : '+ RIR'}
        </button>
      </div>
      </div>
    </div>
  );
}
