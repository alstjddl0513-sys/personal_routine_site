'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Plus, X } from 'lucide-react';
import type { WorkoutSession } from '@repo/shared';
import { createWorkoutSession, deleteWorkoutSession } from '../../lib/api';
import type { MuscleGroupFilter } from '../../lib/muscle-groups';

interface Props {
  date: string;
  group: MuscleGroupFilter;
  sessions: WorkoutSession[];
  activeSessionId: string | null;
}

function buildUrl(
  date: string,
  group: MuscleGroupFilter,
  sessionId: string | null,
): string {
  const qs = new URLSearchParams();
  qs.set('date', date);
  if (group !== 'all') qs.set('group', group);
  if (sessionId) qs.set('session', sessionId);
  return `/workouts?${qs.toString()}`;
}

export function SessionTabs(props: Props) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  if (props.sessions.length === 0) return null;

  async function onAdd() {
    try {
      const created = await createWorkoutSession({ date: props.date });
      startTransition(() => {
        router.push(buildUrl(props.date, props.group, created.id));
        router.refresh();
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function onDelete(id: string, label: string) {
    if (!confirm(`${label}를 삭제할까요? 안의 세트/노트도 함께 사라집니다.`)) return;
    try {
      await deleteWorkoutSession(id);
      const remaining = props.sessions.filter((s) => s.id !== id);
      startTransition(() => {
        router.push(buildUrl(props.date, props.group, remaining[0]?.id ?? null));
        router.refresh();
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.sessions.map((s, i) => {
        const active = s.id === props.activeSessionId;
        const label = `파트 ${i + 1}`;
        return (
          <div key={s.id} className="inline-flex items-center">
            <button
              type="button"
              onClick={() => {
                if (active) return;
                startTransition(() =>
                  router.push(buildUrl(props.date, props.group, s.id)),
                );
              }}
              disabled={busy}
              className={
                active
                  ? 'inline-flex h-8 items-center rounded-l-md border border-r-0 border-zinc-900 bg-zinc-900 px-3 text-xs font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'inline-flex h-8 items-center rounded-l-md border border-r-0 border-zinc-300 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }
            >
              {label}
            </button>
            <button
              type="button"
              onClick={() => onDelete(s.id, label)}
              disabled={busy}
              aria-label={`${label} 삭제`}
              className={
                active
                  ? 'inline-flex h-8 w-7 items-center justify-center rounded-r-md border border-zinc-900 bg-zinc-900 text-white/70 hover:text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900/60 dark:hover:text-zinc-900'
                  : 'inline-flex h-8 w-7 items-center justify-center rounded-r-md border border-zinc-300 bg-white text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
              }
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={onAdd}
        disabled={busy}
        className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-zinc-300 bg-white px-3 text-xs text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
      >
        <Plus className="h-3 w-3" aria-hidden />
        파트 추가
      </button>
    </div>
  );
}
