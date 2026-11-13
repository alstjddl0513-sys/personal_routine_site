'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Exercise, WorkoutSplit } from '@repo/shared';
import {
  deleteAllWorkoutSplits,
  deleteWorkoutSplit,
  reorderWorkoutSplits,
} from '../../lib/api';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';
import { SplitCreateDialog } from '../workouts/splits/SplitCreateDialog';
import { SplitEditDialog } from '../workouts/splits/SplitEditDialog';
import { FOCUS_RING, ListBody, ListCard, ListError, RowAction, TagChip } from './lists/ListCard';
import { ListConfirmDialog } from './lists/ListConfirmDialog';

interface Props {
  initial: WorkoutSplit[];
  /** 보관 안 한 종목 */
  exercises: Exercise[];
}

// 분할 = 이름 + 종목 목록 + 순서. 순서대로 돌아가며 운동(요일 고정 X).
// 만들기·편집 창은 운동 기록 화면과 같은 것(components/workouts/splits). 목록은 설정 목록 카드(lists/ListCard).
export function SplitsManager({ initial, exercises }: Props) {
  const router = useRouter();
  const [splits, setSplits] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setSplits(initial);
  }
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<WorkoutSplit | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSplit | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nameById = new Map(exercises.map((e) => [e.id, e.name]));

  function run(fn: () => Promise<void>, failMsg: string) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(`${failMsg} 잠시 후 다시 해보세요.`);
      }
    });
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...splits];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setSplits(next);
    run(async () => {
      setSplits(await reorderWorkoutSplits(next.map((s) => s.id)));
    }, '순서를 바꾸지 못했어요.');
  }

  return (
    <div className="flex flex-col gap-3">
      <ListError message={error} />

      {splits.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-line bg-surface px-5 py-8 text-center">
          <p className="text-[15px] text-ink-soft">분할을 만들면 운동 기록에서 오늘 할 종목만 볼 수 있어요.</p>
          <button type="button" onClick={() => setCreating(true)} className={BUTTON_PRIMARY}>
            분할 만들기
          </button>
        </div>
      ) : (
        <>
          <ListCard>
            <ListBody ordered>
              {splits.map((s, idx) => (
                <li key={s.id} className="flex min-h-16 items-center gap-3 py-2.5">
                  <span
                    aria-label={`${idx + 1}번째`}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-tag-bg text-sm font-bold text-ink-soft"
                  >
                    {idx + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[15px] font-semibold text-ink-strong">{s.name}</span>
                    {s.exerciseIds.length === 0 ? (
                      <span className="text-[13px] text-ink-muted">아직 담은 종목이 없어요</span>
                    ) : (
                      <span className="flex flex-wrap gap-1.5">
                        {s.exerciseIds
                          .map((id) => nameById.get(id))
                          .filter((n): n is string => !!n)
                          .map((n) => (
                            <TagChip key={n}>{n}</TagChip>
                          ))}
                      </span>
                    )}
                  </div>
                  <div className="-mr-1.5 flex shrink-0 items-center gap-0.5">
                    <RowAction label={`${s.name} 앞으로`} title="앞으로" onClick={() => move(idx, -1)} disabled={idx === 0 || isPending}>
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </RowAction>
                    <RowAction label={`${s.name} 뒤로`} title="뒤로" onClick={() => move(idx, 1)} disabled={idx === splits.length - 1 || isPending}>
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </RowAction>
                    <span aria-hidden className="mx-1 h-5 w-px bg-divider" />
                    <RowAction label={`${s.name} 편집`} title="편집" onClick={() => setEditing(s)}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </RowAction>
                    <RowAction label={`${s.name} 삭제`} title="삭제" onClick={() => setDeleteTarget(s)}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </RowAction>
                  </div>
                </li>
              ))}
            </ListBody>
          </ListCard>
          <UnassignedNote splits={splits} exercises={exercises} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setEditing('new')}
              className={`-ml-1 inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm font-medium text-btn-fg hover:text-heading ${FOCUS_RING}`}
            >
              <Plus className="h-4 w-4" aria-hidden />
              분할 추가
            </button>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              disabled={isPending}
              className={`-mr-1 inline-flex h-10 cursor-pointer items-center rounded-md px-1 text-sm text-ink-muted hover:text-ink disabled:opacity-50 ${FOCUS_RING}`}
            >
              처음부터 다시 짜기
            </button>
          </div>
        </>
      )}

      {creating ? (
        <SplitCreateDialog
          exercises={exercises}
          onClose={() => setCreating(false)}
          onCreated={(created) => {
            setSplits((prev) => {
              const ids = new Set(prev.map((p) => p.id));
              return [...prev, ...created.filter((c) => !ids.has(c.id))];
            });
            setCreating(false);
            router.refresh();
          }}
        />
      ) : null}

      {editing ? (
        <SplitEditDialog
          split={editing === 'new' ? null : editing}
          exercises={exercises}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setSplits((prev) =>
              prev.some((p) => p.id === saved.id)
                ? prev.map((p) => (p.id === saved.id ? saved : p))
                : [...prev, saved],
            );
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}

      <ListConfirmDialog
        open={!!deleteTarget}
        title={`'${deleteTarget?.name ?? ''}' 분할을 삭제할까요?`}
        body="운동 기록은 남아요."
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          const target = deleteTarget;
          if (!target) return;
          run(async () => {
            await deleteWorkoutSplit(target.id);
            setSplits((prev) => prev.filter((p) => p.id !== target.id));
            setDeleteTarget(null);
          }, '분할을 삭제하지 못했어요.');
        }}
      />

      {/* 처음부터 다시 짜기 — 전부 지우면 바로 분할 만들기 창으로 이어짐 */}
      <ListConfirmDialog
        open={resetOpen}
        title={`분할 ${splits.length}개를 모두 지우고 새로 짤까요?`}
        body="운동 기록은 남아요."
        confirmLabel={isPending ? '지우는 중…' : '지우기'}
        pending={isPending}
        onCancel={() => setResetOpen(false)}
        onConfirm={() =>
          run(async () => {
            await deleteAllWorkoutSplits();
            setSplits([]);
            setResetOpen(false);
            setCreating(true);
          }, '분할을 지우지 못했어요.')
        }
      />
    </div>
  );
}

// 어느 분할에도 없는 종목 — 놓치지 않게 카드 아래 한 줄(warn 점).
function UnassignedNote({
  splits,
  exercises,
}: {
  splits: WorkoutSplit[];
  exercises: Exercise[];
}) {
  const inAny = new Set(splits.flatMap((s) => s.exerciseIds));
  const left = exercises.filter((e) => !inAny.has(e.id));
  if (left.length === 0) return null;
  return (
    <p className="flex items-start gap-2 text-sm text-ink-soft">
      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />
      <span>
        어느 분할에도 없는 종목 {left.length}개: {left.map((e) => e.name).join(', ')}
      </span>
    </p>
  );
}
