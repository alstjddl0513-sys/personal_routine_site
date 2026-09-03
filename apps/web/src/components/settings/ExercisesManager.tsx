'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Archive, ArchiveRestore, Check, ChevronDown, ChevronRight, Info, Plus, Trash2, X } from 'lucide-react';
import { type Exercise } from '@repo/shared';
import {
  HttpError,
  createExercise,
  deleteExercise,
  patchExercise,
} from '../../lib/api';
import { useOutsideClick } from '../../lib/useOutsideClick';
import { muscleLabel } from '../../lib/muscle-groups';
import { TargetMuscleSelect } from '../workouts/TargetMuscleSelect';

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

function validateDraft(d: Draft): string | null {
  if (!d.name.trim()) return '이름을 입력하세요.';
  const sets = Number(d.defaultSets);
  const rMin = Number(d.repMin);
  const rMax = Number(d.repMax);
  if (!Number.isInteger(sets) || sets < 1 || sets > 20) return '세트는 1~20 정수여야 합니다.';
  if (!Number.isInteger(rMin) || rMin < 1 || rMin > 100) return '최소 회수는 1~100 정수여야 합니다.';
  if (!Number.isInteger(rMax) || rMax < 1 || rMax > 100) return '최대 회수는 1~100 정수여야 합니다.';
  if (rMin > rMax) return '최소 회수는 최대 회수 이하여야 합니다.';
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
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = includeArchived ? rows : rows.filter((r) => !r.isArchived);

  function beginEdit(row: Exercise) {
    setExpandedId(row.id);
    setDraft(draftFromExercise(row));
    setError(null);
  }

  function cancelEdit() {
    setExpandedId(null);
    setDraft(null);
    setError(null);
  }

  function saveEdit(row: Exercise) {
    if (!draft) return;
    const msg = validateDraft(draft);
    if (msg) {
      setError(msg);
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
        setError('수정에 실패했습니다.');
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
        setError(row.isArchived ? '숨김 해제에 실패했습니다.' : '숨김 처리에 실패했습니다.');
      }
    });
  }

  function requestDelete(row: Exercise) {
    setError(null);
    setConfirm({ kind: 'delete', row });
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
        setError('삭제에 실패했습니다.');
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
        setError('숨김 처리에 실패했습니다.');
        setConfirm(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <label className="inline-flex w-fit items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => setIncludeArchived(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        숨긴 종목 포함 ({rows.filter((r) => r.isArchived).length})
      </label>

      <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {visible.map((row) => {
            const isExpanded = expandedId === row.id;
            return (
              <li key={row.id} className={row.isArchived ? 'opacity-60' : ''}>
                <div className="flex items-center gap-3 px-3 py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => (isExpanded ? cancelEdit() : beginEdit(row))}
                    className="flex flex-1 items-center gap-2 text-left"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    )}
                    <span className="font-medium">{row.name}</span>
                    {row.targetMuscle ? (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        {muscleLabel(row.targetMuscle)}
                      </span>
                    ) : null}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {row.defaultSets}세트 · {row.repMin}~{row.repMax}회
                    </span>
                    {row.isArchived ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                        숨김
                      </span>
                    ) : null}
                  </button>

                  <div className="flex items-center gap-1">
                    <IconButton
                      onClick={() => toggleArchive(row)}
                      disabled={isPending}
                      label={row.isArchived ? '숨김 해제' : '숨김'}
                    >
                      {row.isArchived ? (
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </IconButton>
                    <IconButton
                      onClick={() => requestDelete(row)}
                      disabled={isPending}
                      label="삭제"
                      danger
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                </div>

                {isExpanded && draft ? (
                  <EditForm
                    draft={draft}
                    onChange={setDraft}
                    onSave={() => saveEdit(row)}
                    onCancel={cancelEdit}
                    isPending={isPending}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        <AddRow
          onAdd={(row) => setRows((prev) => [...prev, row])}
          onError={setError}
        />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        <strong>숨김</strong>은 리스트에서만 감추고 세트 이력은 보존.
        <strong>삭제</strong>는 세트 기록이 하나도 없는 종목에만 허용됨.
        운동 순서는 <code>/workouts</code> 카드 hover ↑↓로 조정.
      </p>

      {confirm?.kind === 'delete' ? (
        <ConfirmDialog
          tone="danger"
          icon={<Trash2 className="h-5 w-5" aria-hidden />}
          title="운동 종목 삭제"
          body={
            <>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {confirm.row.name}
              </span>
              을(를) 삭제할까요? 세트 이력이 있으면 삭제할 수 없고,
              대신 &quot;숨김&quot; 처리로 안내됩니다.
            </>
          }
          confirmLabel={isPending ? '삭제 중…' : '삭제'}
          onConfirm={() => performDelete(confirm.row)}
          onCancel={() => setConfirm(null)}
          isPending={isPending}
        />
      ) : null}

      {confirm?.kind === 'archive-fallback' ? (
        <ConfirmDialog
          tone="neutral"
          icon={<Info className="h-5 w-5" aria-hidden />}
          title="삭제할 수 없어요"
          body={
            <>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {confirm.row.name}
              </span>
              에 세트 이력이 있어서 삭제할 수 없습니다.
              대신 <strong>숨김</strong> (리스트에서 감춤, 이력은 보존)
              처리할까요?
            </>
          }
          confirmLabel={isPending ? '숨기는 중…' : '숨김 처리'}
          onConfirm={() => performArchiveFallback(confirm.row)}
          onCancel={() => setConfirm(null)}
          isPending={isPending}
        />
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  tone,
  icon,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
  isPending,
}: {
  tone: 'danger' | 'neutral';
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dialogRef, () => !isPending && onCancel(), true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPending, onCancel]);

  const iconColor =
    tone === 'danger'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-zinc-500 dark:text-zinc-400';
  const confirmClasses =
    tone === 'danger'
      ? 'rounded bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700 disabled:opacity-50'
      : 'rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-3 flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={confirmClasses}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditForm({
  draft,
  onChange,
  onSave,
  onCancel,
  isPending,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="border-t border-zinc-100 bg-zinc-50/50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="이름">
            <input
              type="text"
              value={draft.name}
              onChange={(e) => onChange({ ...draft, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSave();
                if (e.key === 'Escape') onCancel();
              }}
              disabled={isPending}
              maxLength={100}
              autoFocus
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
          <Field label="타겟 부위 (선택)">
            <TargetMuscleSelect
              value={draft.targetMuscle}
              onChange={(next) => onChange({ ...draft, targetMuscle: next })}
              disabled={isPending}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="세트">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={draft.defaultSets}
              onChange={(e) => onChange({ ...draft, defaultSets: e.target.value })}
              disabled={isPending}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
          <Field label="최소 회">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={draft.repMin}
              onChange={(e) => onChange({ ...draft, repMin: e.target.value })}
              disabled={isPending}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
          <Field label="최대 회">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={draft.repMax}
              onChange={(e) => onChange({ ...draft, repMax: e.target.value })}
              disabled={isPending}
              className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X className="h-3.5 w-3.5" />
            취소
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Check className="h-3.5 w-3.5" />
            {isPending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
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
  const [isPending, startTransition] = useTransition();

  function reset() {
    setDraft(ADD_DEFAULTS);
    setOpen(false);
    onError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const msg = validateDraft(draft);
    if (msg) {
      onError(msg);
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
        onError('추가에 실패했습니다.');
      }
    });
  }

  if (!open) {
    return (
      <div className="border-t border-zinc-100 p-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          운동 추가
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Field label="이름">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            disabled={isPending}
            autoFocus
            maxLength={100}
            placeholder="예: 스쿼트"
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
        <Field label="타겟 부위 (선택)">
          <TargetMuscleSelect
            value={draft.targetMuscle}
            onChange={(next) => setDraft({ ...draft, targetMuscle: next })}
            disabled={isPending}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field label="세트">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={draft.defaultSets}
            onChange={(e) => setDraft({ ...draft, defaultSets: e.target.value })}
            disabled={isPending}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
        <Field label="최소 회">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={draft.repMin}
            onChange={(e) => setDraft({ ...draft, repMin: e.target.value })}
            disabled={isPending}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
        <Field label="최대 회">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={draft.repMax}
            onChange={(e) => setDraft({ ...draft, repMax: e.target.value })}
            disabled={isPending}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm tabular-nums outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={reset}
          disabled={isPending}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending ? '추가 중…' : '추가'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function IconButton({
  onClick,
  disabled,
  label,
  danger,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded text-zinc-500 transition-colors disabled:opacity-40 ${
        danger
          ? 'hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300'
          : 'hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  );
}

