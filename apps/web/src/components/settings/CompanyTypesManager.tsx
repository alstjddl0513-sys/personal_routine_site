'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { type CompanyType } from '@repo/shared';
import {
  createCompanyType,
  deleteCompanyType,
  patchCompanyType,
} from '../../lib/api';
import { ConfirmDialog } from '../ui/ConfirmDialog';

// Row-level state kept in a Map so multiple rows can be edited independently.
type EditState = {
  editing: boolean;
  label: string;
};

export function CompanyTypesManager({ initial }: { initial: CompanyType[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<CompanyType[]>(initial);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<CompanyType | null>(null);

  function beginEdit(row: CompanyType) {
    setEdits((prev) => ({ ...prev, [row.id]: { editing: true, label: row.label } }));
  }

  function cancelEdit(id: string) {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function saveEdit(row: CompanyType) {
    const state = edits[row.id];
    if (!state) return;
    const label = state.label.trim();
    if (!label) {
      setError('라벨은 비어 있을 수 없습니다.');
      return;
    }
    if (label === row.label) {
      cancelEdit(row.id);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchCompanyType(row.id, { label });
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        cancelEdit(row.id);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('수정에 실패했습니다.');
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);
    startTransition(async () => {
      try {
        await deleteCompanyType(target.id);
        setRows((prev) => prev.filter((r) => r.id !== target.id));
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('삭제에 실패했습니다.');
        setDeleteTarget(null);
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

      <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map((row) => {
            const state = edits[row.id];
            const isEditing = !!state?.editing;
            return (
              <li key={row.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <code className="min-w-24 truncate text-xs text-zinc-500 dark:text-zinc-500">
                  {row.key}
                </code>
                {isEditing ? (
                  <input
                    type="text"
                    value={state!.label}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [row.id]: { ...state!, label: e.target.value },
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(row);
                      if (e.key === 'Escape') cancelEdit(row.id);
                    }}
                    disabled={isPending}
                    autoFocus
                    className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                ) : (
                  <span className="flex-1">{row.label}</span>
                )}
                {row.isDefault ? (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    기본
                  </span>
                ) : null}

                <div className="ml-auto flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <IconButton onClick={() => saveEdit(row)} disabled={isPending} label="저장">
                        <Check className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton onClick={() => cancelEdit(row.id)} disabled={isPending} label="취소">
                        <X className="h-3.5 w-3.5" />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton onClick={() => beginEdit(row)} disabled={isPending} label="편집">
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={isPending}
                        label="삭제"
                        danger
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </>
                  )}
                </div>
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
        <strong>key</strong>는 회사 데이터에 저장되는 값이라 편집 불가. 라벨만 자유롭게 바꿀 수 있음.
        새 key는 소문자/숫자/언더스코어(<code>_</code>)만 허용.
      </p>

      <ConfirmDialog
        open={!!deleteTarget}
        title="기업 유형 삭제"
        description={
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {deleteTarget?.label}
            </span>
            {' '}유형을 삭제할까요? 기존 회사에 저장된 값은 그대로 유지됩니다.
          </p>
        }
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AddRow({
  onAdd,
  onError,
}: {
  onAdd: (row: CompanyType) => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [isPending, startTransition] = useTransition();

  function reset() {
    setKey('');
    setLabel('');
    setOpen(false);
    onError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const k = key.trim().toLowerCase();
    const l = label.trim();
    if (!/^[a-z0-9_]+$/.test(k)) {
      onError('key는 소문자/숫자/언더스코어만 사용 (예: my_type)');
      return;
    }
    if (!l) {
      onError('라벨을 입력하세요.');
      return;
    }
    onError(null);
    startTransition(async () => {
      try {
        const created = await createCompanyType({ key: k, label: l });
        onAdd(created);
        reset();
        router.refresh();
      } catch (err) {
        console.error(err);
        onError('추가에 실패했습니다. (중복 key일 수 있음)');
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
          유형 추가
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-center gap-2 border-t border-zinc-100 p-2 dark:border-zinc-800"
    >
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="key (예: my_type)"
        disabled={isPending}
        autoFocus
        className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-xs outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="라벨 (예: 내 유형)"
        disabled={isPending}
        className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={isPending || !key || !label}
        className="rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? '추가 중…' : '추가'}
      </button>
      <button
        type="button"
        onClick={reset}
        disabled={isPending}
        className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      >
        취소
      </button>
    </form>
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
