'use client';

import { useState, useTransition } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type {
  Exercise,
  ExerciseStatsPR,
  PreviousWorkout,
  WorkoutSet,
} from '@repo/shared';
import { SetInputs, type SavedSet } from './SetInputs';
import { muscleLabel } from '../../lib/muscle-groups';
import { toISODate } from '../../lib/routines-week';

interface Props {
  exercise: Exercise;
  /** 이 기록의 날짜(YYYY-MM-DD) — 오늘 세운 PR의 날짜 표시용 */
  date: string;
  existingSets: WorkoutSet[];
  previous: PreviousWorkout | null;
  pr: ExerciseStatsPR | null;
  ensureSession: () => Promise<string>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: 'up' | 'down') => Promise<void>;
}

// "11월 1일"
function monthDay(iso: string): string {
  return `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;
}

function toSaved(sets: WorkoutSet[]): SavedSet[] {
  return sets
    .map((s) => ({ weightKg: s.weightKg != null ? Number(s.weightKg) : null, reps: s.reps }))
    .filter((s): s is SavedSet => s.weightKg != null && s.reps != null);
}

// 정보 줄 PR: 오늘 저장한 세트가 기존 PR을 넘으면 오늘 값·날짜로.
function currentPr(
  pr: ExerciseStatsPR | null,
  today: SavedSet[],
  date: string,
): { weightKg: number; reps: number | null; date: string } | null {
  let best = pr ? { weightKg: Number(pr.weightKg), reps: pr.reps, date: pr.sessionDate } : null;
  if (!best) return null; // 지난 기록이 없으면 PR 비교 자체를 안 함(첫 기록은 PR 표시 X)
  for (const s of today) {
    if (
      s.weightKg > best.weightKg ||
      (s.weightKg === best.weightKg && best.reps != null && s.reps > best.reps)
    ) {
      best = { weightKg: s.weightKg, reps: s.reps, date };
    }
  }
  return best;
}

const MOVE_BTN =
  'inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:text-ink disabled:cursor-default disabled:opacity-30';

export function ExerciseCard(props: Props) {
  const [reordering, startReorder] = useTransition();
  const [showRir, setShowRir] = useState(props.existingSets.some((s) => s.rir != null));
  // Mobile-only collapse; desktop always shows body via `md:flex` override.
  const [collapsed, setCollapsed] = useState(false);
  const [todaySaved, setTodaySaved] = useState<SavedSet[]>(() => toSaved(props.existingSets));

  const hasPrev = !!props.previous && props.previous.sets.length > 0;
  const pr = currentPr(props.pr, todaySaved, props.date);
  const muscle = muscleLabel(props.exercise.targetMuscle);

  return (
    <article
      aria-label={props.exercise.name}
      className="group flex min-w-0 flex-col gap-3.5 rounded-lg border border-line bg-surface px-4 pt-4 pb-3.5 focus-within:border-btn-border hover:border-btn-border"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-bold text-heading">{props.exercise.name}</h3>
          <p className="text-[13px] text-ink-muted">
            {muscle ?? '기타'} · 목표 {props.exercise.repMin}~{props.exercise.repMax}회
          </p>
        </div>
        <div className="-mt-2 -mr-2 flex items-center">
          {/* 순서 바꾸기 ↑↓: 카드 hover 또는 안에 포커스가 있을 때만 */}
          <div className="hidden items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
            <button
              type="button"
              onClick={() => startReorder(() => props.onMove('up'))}
              disabled={!props.canMoveUp || reordering}
              aria-label={`${props.exercise.name} 위로`}
              className={MOVE_BTN}
            >
              <ChevronUp className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => startReorder(() => props.onMove('down'))}
              disabled={!props.canMoveDown || reordering}
              aria-label={`${props.exercise.name} 아래로`}
              className={MOVE_BTN}
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? '펼치기' : '접기'}
            className={`${MOVE_BTN} md:hidden`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <div className={`flex-1 flex-col gap-3.5 ${collapsed ? 'hidden md:flex' : 'flex'}`}>
        {/* 라벨(흐리게) · 값(진하게) 두 줄 — "최근 기록 / 최고 기록" 짝. 최근 기록 =
            이 종목을 마지막으로 적은 날(세트 표 오른쪽 열과 같은 이름) */}
        {hasPrev ? (
          <dl className="-mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[13px]">
            <dt className="text-ink-muted">최근 기록</dt>
            <dd className="font-semibold text-ink">{monthDay(props.previous!.date)}</dd>
            {pr ? (
              <>
                <dt className="text-ink-muted">최고 기록</dt>
                <dd className="text-ink-soft">
                  <span className="font-semibold text-ink">
                    {pr.weightKg}kg{pr.reps != null ? ` × ${pr.reps}` : ''}
                  </span>{' '}
                  ·{' '}
                  {pr.date !== props.date
                    ? monthDay(pr.date)
                    : props.date === toISODate(new Date())
                      ? '오늘'
                      : '이날'}
                </dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="-mt-1.5 text-[13px] text-ink-muted">아직 기록이 없어요</p>
        )}
        <SetInputs
          exerciseId={props.exercise.id}
          defaultSets={props.exercise.defaultSets}
          existingSets={props.existingSets}
          ensureSession={props.ensureSession}
          showRir={showRir}
          onToggleRir={() => setShowRir((v) => !v)}
          previous={props.previous}
          pr={props.pr}
          onSaved={setTodaySaved}
        />
      </div>
    </article>
  );
}
