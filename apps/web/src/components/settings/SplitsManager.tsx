'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  WORKOUT_SPLIT_NAME_MAX,
  type Exercise,
  type WorkoutSplit,
  type WorkoutSplitTemplate,
} from '@repo/shared';
import {
  createWorkoutSplit,
  createWorkoutSplitsFromTemplate,
  deleteWorkoutSplit,
  patchWorkoutSplit,
  reorderWorkoutSplits,
} from '../../lib/api';
import { classifyMuscleGroup } from '../../lib/muscle-groups';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Portal } from '../ui/Portal';

interface Props {
  initial: WorkoutSplit[];
  /** 보관 안 한 종목 */
  exercises: Exercise[];
}

const TEMPLATES: { kind: WorkoutSplitTemplate; label: string; hint: string }[] = [
  { kind: 'upper-lower', label: '상체 / 하체', hint: '종목 부위로 자동으로 나눠요' },
  { kind: 'push-pull-legs', label: '밀기 / 당기기 / 하체', hint: '밀기·당기기 종목은 직접 골라요' },
  { kind: 'full-body', label: '전신', hint: '모든 종목을 담아요' },
];

const GROUP_LABEL = { upper: '상체', lower: '하체', other: '기타' } as const;

const ICON_BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-30 dark:hover:bg-zinc-800 dark:hover:text-zinc-200';

// 분할 = 이름 + 종목 목록 + 순서. 순서대로 돌아가며 운동(요일 고정 X).
export function SplitsManager({ initial, exercises }: Props) {
  const router = useRouter();
  const [splits, setSplits] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (prevInitial !== initial) {
    setPrevInitial(initial);
    setSplits(initial);
  }
  const [editing, setEditing] = useState<WorkoutSplit | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutSplit | null>(null);
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
        <div className="flex flex-col gap-4 rounded-md border border-dashed border-zinc-300 p-6 dark:border-zinc-700">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            분할을 만들면 운동 기록에서 오늘 할 종목만 볼 수 있어요.
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.kind}
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    setSplits(await createWorkoutSplitsFromTemplate(t.kind));
                  }, '분할을 만들지 못했어요.')
                }
                className="flex flex-col items-start rounded-md border border-zinc-300 bg-white px-3 py-2 text-left hover:border-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
              >
                <span className="text-sm font-medium">{t.label}</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.hint}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex w-fit items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <Plus className="h-4 w-4" aria-hidden />
            직접 만들기
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
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex w-fit items-center gap-1 rounded px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            <Plus className="h-4 w-4" aria-hidden />
            분할 추가
          </button>
        </>
      )}

      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

      {editing ? (
        <SplitEditor
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
    </div>
  );
}

// 이름 + 종목 체크 목록(부위별로 묶음). 비워둬도 저장 가능 — 나중에 고르면 됨.
function SplitEditor({
  split,
  exercises,
  onClose,
  onSaved,
}: {
  split: WorkoutSplit | null;
  exercises: Exercise[];
  onClose: () => void;
  onSaved: (s: WorkoutSplit) => void;
}) {
  const [name, setName] = useState(split?.name ?? '');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(split?.exerciseIds ?? []));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const groups = (['upper', 'lower', 'other'] as const)
    .map((g) => ({
      key: g,
      items: exercises.filter((e) => classifyMuscleGroup(e.targetMuscle) === g),
    }))
    .filter((g) => g.items.length > 0);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('이름을 입력하세요.');
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const input = { name: trimmed, exerciseIds: [...selected] };
        onSaved(split ? await patchWorkoutSplit(split.id, input) : await createWorkoutSplit(input));
      } catch (err) {
        console.error(err);
        setError('저장하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center md:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="split-editor-title"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !isPending) onClose();
        }}
      >
        <form
          onSubmit={submit}
          className="flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:max-w-md md:rounded-lg dark:bg-zinc-900"
        >
          <div className="flex items-center justify-between">
            <h2 id="split-editor-title" className="text-base font-semibold">
              {split ? '분할 편집' : '새 분할'}
            </h2>
            <button type="button" onClick={onClose} aria-label="닫기" className={ICON_BTN}>
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
            이름
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={WORKOUT_SPLIT_NAME_MAX}
              placeholder="예: 하체 A"
              autoFocus
              className="min-h-10 rounded border border-zinc-300 bg-white px-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">
              담을 종목 <span className="text-zinc-400">· {selected.size}개</span>
            </legend>
            {exercises.length === 0 ? (
              <p className="text-sm text-zinc-500">먼저 운동 종목을 추가해보세요.</p>
            ) : (
              groups.map((g) => (
                <div key={g.key} className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-zinc-400">{GROUP_LABEL[g.key]}</span>
                  <div className="grid grid-cols-2 gap-x-3">
                    {g.items.map((ex) => (
                      <label key={ex.id} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(ex.id)}
                          onChange={() => toggle(ex.id)}
                          className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
                        />
                        <span className="min-w-0 truncate">{ex.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))
            )}
          </fieldset>

          {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="min-h-10 rounded border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-10 rounded bg-zinc-900 px-4 text-sm text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {isPending ? '저장 중…' : split ? '저장' : '만들기'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
