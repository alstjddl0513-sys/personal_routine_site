'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { type Exercise } from '@repo/shared';
import {
  HttpError,
  createExercise,
  deleteExercise,
  patchExercise,
} from '../../lib/api';
import { muscleLabel } from '../../lib/muscle-groups';
import { TargetMuscleSelect } from '../workouts/TargetMuscleSelect';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_INPUT } from '../jobs/cells/popover-style';
import {
  AddLine,
  ExpandPanel,
  FOCUS_RING,
  Field,
  INPUT_ERROR,
  ListBody,
  ListCard,
  ListEmpty,
  ListError,
  ListRow,
  RowAction,
  StatusBadge,
  TagChip,
} from './lists/ListCard';
import { ListConfirmDialog } from './lists/ListConfirmDialog';
import { deleteConfirmTitle } from '../../lib/korean';

type Draft = {
  name: string;
  targetMuscle: string;
  defaultSets: string;
  repMin: string;
  repMax: string;
};

const ADD_DEFAULTS: Draft = {
  name: '',
  targetMuscle: '',
  defaultSets: '3',
  repMin: '8',
  repMax: '12',
};

function draftFromExercise(e: Exercise): Draft {
  return {
    name: e.name,
    targetMuscle: e.targetMuscle ?? '',
    defaultSets: String(e.defaultSets),
    repMin: String(e.repMin),
    repMax: String(e.repMax),
  };
}

type DraftError = { field: keyof Draft; message: string };

function validateDraft(d: Draft): DraftError | null {
  if (!d.name.trim()) return { field: 'name', message: '이름을 입력하세요.' };
  const sets = Number(d.defaultSets);
  const rMin = Number(d.repMin);
  const rMax = Number(d.repMax);
  if (!Number.isInteger(sets) || sets < 1 || sets > 20)
    return { field: 'defaultSets', message: '세트는 1~20 사이 숫자로 적어주세요.' };
  if (!Number.isInteger(rMin) || rMin < 1 || rMin > 100)
    return { field: 'repMin', message: '최소 횟수는 1~100 사이 숫자로 적어주세요.' };
  if (!Number.isInteger(rMax) || rMax < 1 || rMax > 100)
    return { field: 'repMax', message: '최대 횟수는 1~100 사이 숫자로 적어주세요.' };
  if (rMin > rMax) return { field: 'repMin', message: '최소 횟수가 최대보다 클 수 없어요.' };
  return null;
}

type ConfirmState =
  | { kind: 'delete'; row: Exercise }
  | { kind: 'archive-fallback'; row: Exercise };

export function ExercisesManager({ initial }: { initial: Exercise[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Exercise[]>(initial);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<DraftError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [isPending, startTransition] = useTransition();

  const archivedCount = rows.filter((r) => r.isArchived).length;
  // 숨긴 게 하나도 안 남으면 토글이 사라지니 보기 상태도 같이 끔. 숨긴 종목은 목록 끝으로.
  const showArchived = includeArchived && archivedCount > 0;
  const visible = [
    ...rows.filter((r) => !r.isArchived),
    ...(showArchived ? rows.filter((r) => r.isArchived) : []),
  ];

  function beginEdit(row: Exercise) {
    setExpandedId(row.id);
    setDraft(draftFromExercise(row));
    setDraftError(null);
    setError(null);
  }

  function cancelEdit() {
    setExpandedId(null);
    setDraft(null);
    setDraftError(null);
  }

  function saveEdit(row: Exercise) {
    if (!draft) return;
    const invalid = validateDraft(draft);
    if (invalid) {
      setDraftError(invalid);
      return;
    }
    const patch = {
      name: draft.name.trim(),
      targetMuscle: draft.targetMuscle.trim() || null,
      defaultSets: Number(draft.defaultSets),
      repMin: Number(draft.repMin),
      repMax: Number(draft.repMax),
    };
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchExercise(row.id, patch);
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        cancelEdit();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('고치지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function toggleArchive(row: Exercise) {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchExercise(row.id, { isArchived: !row.isArchived });
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(row.isArchived ? '숨김을 풀지 못했어요. 잠시 후 다시 해보세요.' : '숨기지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function performDelete(row: Exercise) {
    startTransition(async () => {
      try {
        await deleteExercise(row.id);
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setConfirm(null);
        router.refresh();
      } catch (err) {
        if (err instanceof HttpError && err.status === 409) {
          setConfirm({ kind: 'archive-fallback', row });
          return;
        }
        console.error(err);
        setError('삭제하지 못했어요. 잠시 후 다시 해보세요.');
        setConfirm(null);
      }
    });
  }

  function performArchiveFallback(row: Exercise) {
    startTransition(async () => {
      try {
        const updated = await patchExercise(row.id, { isArchived: true });
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        setConfirm(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('숨기지 못했어요. 잠시 후 다시 해보세요.');
        setConfirm(null);
      }
    });
  }

  const confirmName = confirm?.row.name ?? '';

  return (
    <div className="flex flex-col gap-3">
      <ListError message={error} />

      {archivedCount > 0 ? (
        <button
          type="button"
          onClick={() => setIncludeArchived((v) => !v)}
          aria-pressed={showArchived}
          className={`-ml-1 inline-flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-md px-1 text-sm font-medium text-btn-fg hover:text-heading ${FOCUS_RING}`}
        >
          {showArchived ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          {showArchived ? '숨긴 종목 가리기' : `숨긴 종목 ${archivedCount}개 보기`}
        </button>
      ) : null}

      <ListCard>
        {visible.length === 0 ? <ListEmpty>아직 등록한 종목이 없어요.</ListEmpty> : null}
        <ListBody>
          {visible.map((row) => {
            const isExpanded = expandedId === row.id;
            const muscle = muscleLabel(row.targetMuscle);
            return (
              <ListRow
                key={row.id}
                name={row.name}
                dimmed={row.isArchived}
                badges={
                  <>
                    {muscle ? <TagChip>{muscle}</TagChip> : null}
                    {row.isArchived ? <StatusBadge>숨김</StatusBadge> : null}
                  </>
                }
                sub={`${row.defaultSets}세트 · ${row.repMin}~${row.repMax}회`}
                expand={{
                  open: isExpanded,
                  onToggle: () => (isExpanded ? cancelEdit() : beginEdit(row)),
                  label: `${row.name} 고치기`,
                }}
                actions={
                  <>
                    <RowAction
                      label={row.isArchived ? `${row.name} 다시 보이기` : `${row.name} 숨기기`}
                      title={row.isArchived ? '다시 보이기' : '숨기기 — 목록에서만 감추고 기록은 남아요'}
                      onClick={() => toggleArchive(row)}
                      disabled={isPending}
                    >
                      {row.isArchived ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                    </RowAction>
                    <RowAction
                      label={`${row.name} 삭제`}
                      title="삭제"
                      onClick={() => {
                        setError(null);
                        setConfirm({ kind: 'delete', row });
                      }}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </RowAction>
                  </>
                }
                panel={
                  isExpanded && draft ? (
                    <ExpandPanel>
                      <ExerciseFields draft={draft} onChange={setDraft} error={draftError} onClearError={() => setDraftError(null)} isPending={isPending} onEnter={() => saveEdit(row)} onEscape={cancelEdit} />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={cancelEdit} disabled={isPending} className={BUTTON_SECONDARY}>
                          취소
                        </button>
                        <button type="button" onClick={() => saveEdit(row)} disabled={isPending} className={BUTTON_PRIMARY}>
                          {isPending ? '저장 중…' : '저장'}
                        </button>
                      </div>
                    </ExpandPanel>
                  ) : null
                }
              />
            );
          })}
        </ListBody>

        <AddRow onAdd={(row) => setRows((prev) => [...prev, row])} onError={setError} />
      </ListCard>

      <ListConfirmDialog
        open={confirm?.kind === 'delete'}
        title={deleteConfirmTitle(confirmName)}
        body="이미 기록한 세트가 있다면 지울 수 없고 '숨김'으로만 감출 수 있어요."
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={() => confirm?.kind === 'delete' && performDelete(confirm.row)}
        onCancel={() => setConfirm(null)}
      />

      <ListConfirmDialog
        open={confirm?.kind === 'archive-fallback'}
        title="삭제할 수 없어요"
        body={`'${confirmName}'에는 이미 기록한 세트가 있어서 지울 수 없어요. 대신 숨김으로 목록에서만 감춰볼까요? 이력은 그대로 남아요.`}
        tone="primary"
        confirmLabel={isPending ? '숨기는 중…' : '숨기기'}
        pending={isPending}
        onConfirm={() => confirm?.kind === 'archive-fallback' && performArchiveFallback(confirm.row)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

// 펼침 · 추가 칸 공통 — 이름 · 부위 · 세트 · 최소 · 최대(grid 1.6fr 1fr 72px×3)
function ExerciseFields({
  draft,
  onChange,
  error,
  onClearError,
  isPending,
  onEnter,
  onEscape,
  autoFocusName = true,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  error: DraftError | null;
  onClearError: () => void;
  isPending: boolean;
  onEnter?: () => void;
  onEscape: () => void;
  autoFocusName?: boolean;
}) {
  const set = (k: keyof Draft, v: string) => {
    onChange({ ...draft, [k]: v });
    if (error) onClearError();
  };
  const errCls = (k: keyof Draft) => (error?.field === k ? INPUT_ERROR : '');
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) onEnter();
    if (e.key === 'Escape') onEscape();
  };
  const num = (k: 'defaultSets' | 'repMin' | 'repMax', label: string, max: number) => (
    <Field label={label}>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        value={draft[k]}
        onChange={(e) => set(k, e.target.value)}
        onKeyDown={keys}
        disabled={isPending}
        aria-invalid={error?.field === k}
        className={`${POPOVER_INPUT} text-[15px] ${errCls(k)}`}
      />
    </Field>
  );
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-[1.6fr_1fr_72px_72px_72px]">
        <Field label="이름" className="col-span-2 md:col-span-1">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            onKeyDown={keys}
            disabled={isPending}
            maxLength={100}
            autoFocus={autoFocusName}
            placeholder="이름 (예: 벤치프레스)"
            aria-invalid={error?.field === 'name'}
            className={`${POPOVER_INPUT} text-[15px] ${errCls('name')}`}
          />
        </Field>
        <Field label="부위" className="col-span-2 md:col-span-1">
          <TargetMuscleSelect
            value={draft.targetMuscle}
            onChange={(next) => set('targetMuscle', next)}
            disabled={isPending}
            className={`${POPOVER_INPUT} text-[15px]`}
          />
        </Field>
        {num('defaultSets', '세트', 20)}
        {num('repMin', '최소 횟수', 100)}
        {num('repMax', '최대 횟수', 100)}
      </div>
      {error ? <p className="text-[13px] text-alert">{error.message}</p> : null}
    </div>
  );
}

function AddRow({
  onAdd,
  onError,
}: {
  onAdd: (row: Exercise) => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(ADD_DEFAULTS);
  const [draftError, setDraftError] = useState<DraftError | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setDraft(ADD_DEFAULTS);
    setDraftError(null);
    setOpen(false);
    onError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const invalid = validateDraft(draft);
    if (invalid) {
      setDraftError(invalid);
      return;
    }
    onError(null);
    startTransition(async () => {
      try {
        const created = await createExercise({
          name: draft.name.trim(),
          targetMuscle: draft.targetMuscle.trim() || undefined,
          defaultSets: Number(draft.defaultSets),
          repMin: Number(draft.repMin),
          repMax: Number(draft.repMax),
        });
        onAdd(created);
        reset();
        router.refresh();
      } catch (err) {
        console.error(err);
        onError('추가하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  if (!open) return <AddLine label="종목 추가" onClick={() => setOpen(true)} />;

  return (
    <form onSubmit={submit}>
      <ExpandPanel last>
        <ExerciseFields
          draft={draft}
          onChange={setDraft}
          error={draftError}
          onClearError={() => setDraftError(null)}
          isPending={isPending}
          onEscape={reset}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={reset} disabled={isPending} className={BUTTON_SECONDARY}>
            취소
          </button>
          <button type="submit" disabled={isPending} className={BUTTON_PRIMARY}>
            {isPending ? '추가 중…' : '추가'}
          </button>
        </div>
      </ExpandPanel>
    </form>
  );
}
