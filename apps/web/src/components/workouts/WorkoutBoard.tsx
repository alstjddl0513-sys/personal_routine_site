'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Exercise,
  ExerciseStatsPR,
  PreviousWorkout,
  WorkoutSession,
  WorkoutSet,
} from '@repo/shared';
import { createWorkoutSession, patchExercise } from '../../lib/api';
import { ExerciseCard } from './ExerciseCard';
import { SessionNoteCard } from './SessionNoteCard';

interface Props {
  exercises: Exercise[];
  date: string;
  initialSession: WorkoutSession | null;
  setsByExercise: Record<string, WorkoutSet[]>;
  previousByExercise: Record<string, PreviousWorkout | null>;
  prByExercise: Record<string, ExerciseStatsPR | null>;
}

export function WorkoutBoard(props: Props) {
  const router = useRouter();
  // Refs (not state) so single-flight tracking is immediate and immune to the
  // "state updated but closure not re-rendered yet" race between concurrent
  // card saves — otherwise two blurs firing back-to-back could both see
  // sessionId=null and each POST a session, hitting the date UNIQUE violation.
  const sessionRef = useRef<string | null>(props.initialSession?.id ?? null);
  const pendingRef = useRef<Promise<string> | null>(null);

  // Resync on date change (server re-renders with new initialSession).
  useEffect(() => {
    sessionRef.current = props.initialSession?.id ?? null;
    pendingRef.current = null;
  }, [props.date, props.initialSession]);

  async function ensureSession(): Promise<string> {
    if (sessionRef.current) return sessionRef.current;
    if (pendingRef.current) return pendingRef.current;
    const p = (async () => {
      try {
        const s = await createWorkoutSession({ date: props.date });
        sessionRef.current = s.id;
        return s.id;
      } finally {
        pendingRef.current = null;
      }
    })();
    pendingRef.current = p;
    return p;
  }

  async function reorder(idx: number, dir: 'up' | 'down') {
    const adjIdx = dir === 'up' ? idx - 1 : idx + 1;
    const cur = props.exercises[idx];
    const adj = props.exercises[adjIdx];
    if (!cur || !adj) return;
    await Promise.all([
      patchExercise(cur.id, { sortOrder: adj.sortOrder }),
      patchExercise(adj.id, { sortOrder: cur.sortOrder }),
    ]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <SessionNoteCard
        initialNote={props.initialSession?.note ?? ''}
        ensureSession={ensureSession}
      />
      {props.exercises.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          등록된 운동이 없습니다. 시드 스크립트를 먼저 실행해 주세요.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {props.exercises.map((e, idx) => (
            <ExerciseCard
              key={e.id}
              exercise={e}
              existingSets={props.setsByExercise[e.id] ?? []}
              previous={props.previousByExercise[e.id] ?? null}
              pr={props.prByExercise[e.id] ?? null}
              ensureSession={ensureSession}
              canMoveUp={idx > 0}
              canMoveDown={idx < props.exercises.length - 1}
              onMove={(dir) => reorder(idx, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
