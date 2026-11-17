'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type {
  Exercise,
  ExerciseStatsPR,
  PreviousWorkout,
  WorkoutSession,
  WorkoutSet,
  WorkoutSplit,
} from '@repo/shared';
import { createWorkoutSession, patchExercise, patchWorkoutSession } from '../../lib/api';
import { ExerciseCard } from './ExerciseCard';
import { SessionNoteCard } from './SessionNoteCard';
import { GROUP_TABS, type MuscleGroupFilter } from '../../lib/muscle-groups';
import { AddExerciseButton } from './AddExerciseButton';
import { SplitTabs } from './SplitTabs';
import { SplitIntroBand, SplitIntroButton } from './SplitIntro';
import Link from 'next/link';

interface Props {
  exercises: Exercise[];
  date: string;
  group: MuscleGroupFilter;
  sessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  setsByExercise: Record<string, WorkoutSet[]>;
  previousByExercise: Record<string, PreviousWorkout | null>;
  prByExercise: Record<string, ExerciseStatsPR | null>;
  /** 부위 필터와 상관없는 전체 종목 수 — 빈 상태 구분용 */
  totalExercises: number;
  /** 카드 위 줄(부위 탭 또는 분할 요약 + 종목 동작) — 카드를 거르는 필터라 카드 바로 위 */
  groupTabs: React.ReactNode;
  /** 분할 — 비어 있으면 부위 탭으로 거르고, 맨 위 줄엔 첫 사용 안내 */
  splits: WorkoutSplit[];
  /** 고른 분할 id 또는 'all'. 분할이 없으면 null */
  selectedSplitId: string | null;
  nextSplitId: string | null;
  lastSplitId: string | null;
  /** 보관 안 한 전체 종목 — 분할 만들기 창용 */
  allExercises: Exercise[];
  /** 모바일 · 분할이 없을 때 맨 위 부위 칩 줄(데스크톱은 카드 위 밑줄 탭) */
  mobileGroupChips?: React.ReactNode;
}

export function WorkoutBoard(props: Props) {
  const router = useRouter();
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

  const hasSplits = props.splits.length > 0;
  const realSplitId =
    props.selectedSplitId && props.selectedSplitId !== 'all' ? props.selectedSplitId : null;
  const selectedSplit = props.splits.find((s) => s.id === realSplitId) ?? null;

  // 기존 기록에 분할이 안 남아 있으면(분할을 만들기 전 기록, "전체"로 적던 날) 고른 분할로
  // 처음 저장할 때 한 번 남김 — 탭엔 다음 차례가 골라져 있는데 기록엔 없으면 차례가 안 넘어감.
  const splitStampedRef = useRef(false);
  useEffect(() => {
    splitStampedRef.current = false;
  }, [props.date, props.activeSession]);

  async function ensureSession(): Promise<string> {
    if (sessionRef.current) {
      if (
        realSplitId &&
        !splitStampedRef.current &&
        props.activeSession?.id === sessionRef.current &&
        props.activeSession.splitId == null
      ) {
        splitStampedRef.current = true;
        patchWorkoutSession(sessionRef.current, { splitId: realSplitId }).catch((err) =>
          console.error(err),
        );
      }
      return sessionRef.current;
    }
    if (pendingRef.current) return pendingRef.current;
    const p = (async () => {
      try {
        // 그날 첫 기록에 고른 분할을 남김 — 다음 차례 계산용("전체"면 없음)
        const s = await createWorkoutSession({ date: props.date, splitId: realSplitId });
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

  const groupLabel = GROUP_TABS.find((t) => t.key === props.group)?.label ?? '';
  // 모바일 카드 정보 줄 앞 부위 — 전체를 볼 때만(분할 · 부위 칩이 이미 같은 말이라)
  const showMuscle = hasSplits ? props.selectedSplitId === 'all' : props.group === 'all';

  return (
    <div className="flex flex-col gap-5 max-md:gap-3.5">
      {/* 분할이 없을 때 첫 사용 안내는 맨 위 줄과 따로 한 줄 띠 — 같은 줄에 두면 글·버튼·입력칸이 몰림 */}
      {!hasSplits && props.allExercises.length > 0 ? (
        <SplitIntroBand exercises={props.allExercises} />
      ) : null}
      {/* 맨 위 줄: 분할 탭(또는 안내를 닫은 뒤 [+ 분할 만들기]) │ 컨디션. 카드·선 없이 여백만.
          하루 안 '파트' 나누기는 거의 안 써서 화면에서 뺌(하루 기록 하나).
          모바일은 세로로: 칩 줄(분할 또는 부위) → 컨디션 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 max-md:flex-col max-md:flex-nowrap max-md:items-stretch">
        {!hasSplits && props.mobileGroupChips ? (
          <div className="flex flex-col md:hidden">{props.mobileGroupChips}</div>
        ) : null}
        {hasSplits ? (
          <>
            <SplitTabs
              splits={props.splits}
              selected={props.selectedSplitId ?? 'all'}
              nextSplitId={props.nextSplitId}
              lastSplitId={props.lastSplitId}
              activeSessionId={props.activeSession?.id ?? null}
            />
            <span aria-hidden className="hidden h-6 w-px shrink-0 bg-divider md:block" />
          </>
        ) : props.allExercises.length > 0 ? (
          <SplitIntroButton exercises={props.allExercises} divider={<span aria-hidden className="hidden h-6 w-px shrink-0 bg-divider md:block" />} />
        ) : null}
        <SessionNoteCard
          key={props.activeSession?.id ?? 'empty'}
          initialNote={props.activeSession?.note ?? ''}
          ensureSession={ensureSession}
        />
      </div>
      {/* 예전에 하루를 나눠 적은 날만 — 새로 나누는 기능은 없음 */}
      {props.sessions.length >= 2 ? (
        <div className="flex flex-col gap-2 md:hidden">
          <p className="text-[13px] text-ink-muted">이날 기록이 {props.sessions.length}개 있어요</p>
          <nav aria-label="이날 기록" className="flex rounded-md border border-btn-border">
            {props.sessions.map((sess, i) => {
              const on = sess.id === props.activeSession?.id;
              return (
                <Link
                  key={sess.id}
                  href={`/workouts?date=${props.date}&session=${sess.id}`}
                  aria-current={on ? 'page' : undefined}
                  className={`inline-flex min-h-10 flex-1 items-center justify-center text-sm not-first:border-l not-first:border-btn-border ${
                    on
                      ? 'rounded-md bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
                      : 'text-ink-soft'
                  }`}
                >
                  기록 {i + 1}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
      {props.sessions.length >= 2 ? (
        <p className="-mt-2 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-muted max-md:hidden">
          이날 기록이 {props.sessions.length}개 있어요
          {props.sessions.map((sess, i) => (
            <Link
              key={sess.id}
              href={`/workouts?date=${props.date}&session=${sess.id}`}
              aria-current={sess.id === props.activeSession?.id ? 'page' : undefined}
              className={`inline-flex min-h-8 items-center ${
                sess.id === props.activeSession?.id ? 'font-semibold text-heading' : 'text-heading hover:underline'
              }`}
            >
              · 기록 {i + 1}
            </Link>
          ))}
        </p>
      ) : null}
      {props.groupTabs}
      {props.totalExercises === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-6 py-10 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-[17px] font-bold text-ink-strong">자주 하는 운동부터 추가해보세요</p>
            <p className="text-sm text-ink-muted">종목이 생기면 상체·하체처럼 분할로 나눌 수도 있어요.</p>
          </div>
          <AddExerciseButton variant="primary" />
        </div>
      ) : selectedSplit && props.exercises.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-6 py-10 text-center">
          <p className="text-ink-soft">이 분할에 담긴 종목이 없어요.</p>
          {/* 모바일은 링크 하나만 — 위 줄 [+ 종목 추가]가 이미 이 분할에 담아줌 */}
          <AddExerciseButton variant="link" mobileVariant="none" split={selectedSplit} />
          <Link
            href="/settings/splits"
            className="inline-flex min-h-10 items-center text-sm text-heading hover:underline max-md:hidden"
          >
            설정에서 종목 고르기 ›
          </Link>
          <Link
            href="/settings/splits"
            className="inline-flex min-h-10 items-center text-sm font-medium text-heading md:hidden"
          >
            분할에 종목 담기 ›
          </Link>
        </div>
      ) : props.exercises.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface px-6 py-10 text-center max-md:gap-3">
          <p className="text-ink-soft">{groupLabel} 부위 종목이 없어요.</p>
          <AddExerciseButton variant="link" mobileVariant="outline" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 max-md:gap-3 md:grid-cols-2 xl:grid-cols-3">
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
              showMuscle={showMuscle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
