'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Exercise, WorkoutSplit } from '@repo/shared';
import {
  deleteAllWorkoutSplits,
  deleteWorkoutSplit,
  reorderWorkoutSplits,
} from '../../lib/api';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';
import { SplitCreateDialog } from '../workouts/splits/SplitCreateDialog';
import { SplitEditDialog } from '../workouts/splits/SplitEditDialog';

interface Props {
  initial: WorkoutSplit[];
  /** 보관 안 한 종목 */
  exercises: Exercise[];
}

const ICON_BTN =
  'inline-flex h-10 w-10 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

// 분할 = 이름 + 종목 목록 + 순서. 순서대로 돌아가며 운동(요일 고정 X).
// 만들기·편집 창은 운동 기록 화면과 같은 것(components/workouts/splits). 목록 본문은
// 설정의 다른 관리 화면과 같은 톤 — 설정 개편 때 함께.
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
      {splits.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-line bg-surface p-6">
          <p className="text-sm text-ink-soft">
            분할을 만들면 운동 기록에서 오늘 할 종목만 볼 수 있어요.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className={`${BUTTON_PRIMARY} gap-1`}
          >
            <Plus className="h-4 w-4" aria-hidden />
            분할 만들기
          </button>
        </div>
      ) : (
        <>
          <ol className="divide-y divide-zinc-100 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {splits.map((s, idx) => (
              <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-5 shrink-0 text-center text-xs tabular-nums text-zinc-400">
                  {idx + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium">{s.name}</span>
                  {s.exerciseIds.length === 0 ? (
                    <span className="text-xs text-zinc-400">아직 담은 종목이 없어요</span>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {s.exerciseIds
                        .map((id) => nameById.get(id))
                        .filter((n): n is string => !!n)
                        .map((n) => (
                          <span
                            key={n}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {n}
                          </span>
                        ))}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0 || isPending}
                    aria-label={`${s.name} 앞으로`}
                    className={ICON_BTN}
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === splits.length - 1 || isPending}
                    aria-label={`${s.name} 뒤로`}
                    className={ICON_BTN}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(s)}
                    aria-label={`${s.name} 편집`}
                    className={ICON_BTN}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(s)}
                    aria-label={`${s.name} 삭제`}
                    className={`${ICON_BTN} hover:text-rose-600 dark:hover:text-rose-400`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <UnassignedNote splits={splits} exercises={exercises} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="inline-flex min-h-10 w-fit items-center gap-1 rounded px-2 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              <Plus className="h-4 w-4" aria-hidden />
              분할 추가
            </button>
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              disabled={isPending}
              className="min-h-10 rounded px-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              처음부터 다시 짜기
            </button>
          </div>
        </>
      )}

      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

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

      <ConfirmDialog
        open={!!deleteTarget}
        title="분할 삭제"
        description={
          <p>
            <span className="font-medium">{deleteTarget?.name}</span> 분할을 삭제할까요? 운동 기록은 남아요.
          </p>
        }
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

      {/* 처음부터 다시 짜기 — 전부 지우면 바로 '분할 만들기'로 이어짐 */}
      <ConfirmDialog
        open={resetOpen}
        title="처음부터 다시 짜기"
        description={<p>분할 {splits.length}개를 모두 지우고 새로 짤까요? 운동 기록은 남아요.</p>}
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

// 어느 분할에도 없는 종목 — 놓치지 않게 목록 아래 한 줄.
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
    <p className="text-xs text-zinc-500 dark:text-zinc-400">
      어느 분할에도 없는 종목 {left.length}개: {left.map((e) => e.name).join(', ')}
    </p>
  );
}
