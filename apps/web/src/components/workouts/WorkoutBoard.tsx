'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { SessionTabs } from './SessionTabs';
import { GROUP_TABS, type MuscleGroupFilter } from '../../lib/muscle-groups';
import { AddExerciseButton } from './AddExerciseButton';

interface Props {
  exercises: Exercise[];
  date: string;
  group: MuscleGroupFilter;
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  setsByExercise: Record<string, WorkoutSet[]>;
  previousByExercise: Record<string, PreviousWorkout | null>;
  prByExercise: Record<string, ExerciseStatsPR | null>;
  /** 현재 파트의 세트 수 (파트 삭제 확인 문구) */
  activeSetCount: number;
  /** 부위 필터와 상관없는 전체 종목 수 — 빈 상태 구분용 */
  totalExercises: number;
  /** 부위 탭 줄 — 파트·메모 줄과 카드 사이에 둠(카드를 거르는 필터라 카드 바로 위) */
  groupTabs: React.ReactNode;
}

export function WorkoutBoard(props: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Refs (not state) so single-flight tracking is immediate and immune to the
  // "state updated but closure not re-rendered yet" race between concurrent
  // card saves — otherwise two blurs firing back-to-back could both see
  // sessionId=null and each POST a session, hitting a duplicate insert.
  const sessionRef = useRef<string | null>(props.activeSession?.id ?? null);
  const pendingRef = useRef<Promise<string> | null>(null);

  // Resync on date/session change (server re-renders with new activeSession).
  useEffect(() => {
    sessionRef.current = props.activeSession?.id ?? null;
    pendingRef.current = null;
  }, [props.date, props.activeSession]);

  async function ensureSession(): Promise<string> {
    if (sessionRef.current) return sessionRef.current;
    if (pendingRef.current) return pendingRef.current;
    const p = (async () => {
      try {
        const s = await createWorkoutSession({ date: props.date });
        sessionRef.current = s.id;
        // First lazy-created session on this date — pin it into the URL so a
        // page refresh keeps the same active session (relevant once the user
        // adds a second session).
        if (props.sessions.length === 0) {
          const qs = new URLSearchParams(searchParams?.toString() ?? '');
          qs.set('session', s.id);
          router.replace(`/workouts?${qs.toString()}`);
        }
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

  const groupLabel = GROUP_TABS.find((t) => t.key === props.group)?.label ?? '';

  return (
    <div className="flex flex-col gap-5">
      {/* 파트 + 컨디션 한 줄 — 메모는 파트에 딸린 값이라 같은 줄. 카드·선 없이 여백만 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <SessionTabs
          date={props.date}
          group={props.group}
          sessions={props.sessions}
          activeSessionId={props.activeSession?.id ?? null}
          activeSetCount={props.activeSetCount}
        />
        <span aria-hidden className="hidden h-6 w-px bg-divider md:block" />
        <SessionNoteCard
          key={props.activeSession?.id ?? 'empty'}
          initialNote={props.activeSession?.note ?? ''}
          ensureSession={ensureSession}
        />
      </div>
      {props.groupTabs}
      {props.totalExercises === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-10 text-center">
          <p className="text-ink-soft">아직 등록한 운동이 없어요.</p>
          <AddExerciseButton variant="primary" />
        </div>
      ) : props.exercises.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-6 py-10 text-center">
          <p className="text-ink-soft">{groupLabel} 부위 종목이 없어요.</p>
          <AddExerciseButton variant="link" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {props.exercises.map((e, idx) => (
            <ExerciseCard
              key={`${props.activeSession?.id ?? 'empty'}:${e.id}`}
              exercise={e}
              date={props.date}
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
