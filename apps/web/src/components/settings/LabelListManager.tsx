'use client';

import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Pencil, Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';

// 이름 하나짜리 목록 관리(회사 유형 · 학습 카테고리) — 두 화면이 같은 코드를 따로 갖고 있던 걸 합침.
// 줄마다 이름 고치기(Enter 저장 · Esc 취소) · 삭제(확인 창), 맨 아래 [추가].
export interface LabelItem {
  id: string;
  label: string;
  isDefault: boolean;
}

export interface LabelListManagerProps<T extends LabelItem> {
  initial: T[];
  /** 내부 key 앞에 붙일 말(사용자는 안 봄) */
  keyPrefix: string;
  create: (input: { key: string; label: string }) => Promise<T>;
  patch: (id: string, input: { label: string }) => Promise<T>;
  remove: (id: string) => Promise<unknown>;
  /** "유형 추가" */
  addLabel: string;
  /** "이름 (예: 내 유형)" */
  placeholder: string;
  /** "회사 유형 삭제" */
  deleteTitle: string;
  /** 확인 창 본문 — 이름 강조는 여기서 */
  deleteDescription: (label: ReactNode) => ReactNode;
}

export function LabelListManager<T extends LabelItem>({
  initial,
  keyPrefix,
  create,
  patch,
  remove,
  addLabel,
  placeholder,
  deleteTitle,
  deleteDescription,
}: LabelListManagerProps<T>) {
  const router = useRouter();
  const [rows, setRows] = useState<T[]>(initial);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  function beginEdit(row: T) {
    setEdits((prev) => ({ ...prev, [row.id]: row.label }));
  }

  function cancelEdit(id: string) {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function saveEdit(row: T) {
    const draft = edits[row.id];
    if (draft === undefined) return;
    const label = draft.trim();
    if (!label) {
      setError('이름을 입력하세요.');
      return;
    }
    if (label === row.label) {
      cancelEdit(row.id);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patch(row.id, { label });
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        cancelEdit(row.id);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('고치지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);
    startTransition(async () => {
      try {
        await remove(target.id);
        setRows((prev) => prev.filter((r) => r.id !== target.id));
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('삭제하지 못했어요. 잠시 후 다시 해보세요.');
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
            const draft = edits[row.id];
            const isEditing = draft !== undefined;
            return (
              <li key={row.id} className="flex items-center gap-2 px-3 py-1 text-sm">
                {isEditing ? (
                  <input
                    type="text"
                    value={draft}
                    aria-label={`${row.label} 이름`}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(row);
                      if (e.key === 'Escape') cancelEdit(row.id);
                    }}
                    disabled={isPending}
                    autoFocus
                    className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                ) : (
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                )}
                {row.isDefault ? (
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    기본
                  </span>
                ) : null}

                <div className="ml-auto flex shrink-0 items-center">
                  {isEditing ? (
                    <>
                      <IconButton onClick={() => saveEdit(row)} disabled={isPending} label="저장">
                        <Check className="h-4 w-4" />
                      </IconButton>
                      <IconButton onClick={() => cancelEdit(row.id)} disabled={isPending} label="취소">
                        <X className="h-4 w-4" />
                      </IconButton>
                    </>
                  ) : (
                    <>
                      <IconButton onClick={() => beginEdit(row)} disabled={isPending} label={`${row.label} 이름 고치기`}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        onClick={() => setDeleteTarget(row)}
                        disabled={isPending}
                        label={`${row.label} 삭제`}
                        danger
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <AddRow
          keyPrefix={keyPrefix}
          create={create}
          addLabel={addLabel}
          placeholder={placeholder}
          onAdd={(row) => setRows((prev) => [...prev, row])}
          onError={setError}
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={deleteTitle}
        description={deleteDescription(
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{deleteTarget?.label}</span>,
        )}
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AddRow<T extends LabelItem>({
  keyPrefix,
  create,
  addLabel,
  placeholder,
  onAdd,
  onError,
}: {
  keyPrefix: string;
  create: (input: { key: string; label: string }) => Promise<T>;
  addLabel: string;
  placeholder: string;
  onAdd: (row: T) => void;
  onError: (msg: string | null) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [isPending, startTransition] = useTransition();

  function reset() {
    setLabel('');
    setOpen(false);
    onError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const l = label.trim();
    if (!l) {
      onError('이름을 입력하세요.');
      return;
    }
    onError(null);
    startTransition(async () => {
      try {
        const created = await create({ key: newKey(keyPrefix), label: l });
        onAdd(created);
        reset();
        router.refresh();
      } catch (err) {
        console.error(err);
        onError('추가하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  if (!open) {
    return (
      <div className="border-t border-zinc-100 p-1 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-10 items-center gap-1 rounded px-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {addLabel}
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
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') reset();
        }}
        placeholder={placeholder}
        aria-label={addLabel}
        disabled={isPending}
        autoFocus
        className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={isPending || !label.trim()}
        className="min-h-10 rounded bg-zinc-900 px-3 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? '추가 중…' : '추가'}
      </button>
      <button
        type="button"
        onClick={reset}
        disabled={isPending}
        className="min-h-10 rounded px-2 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
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
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded text-zinc-500 transition-colors disabled:opacity-40 ${
        danger
          ? 'hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-300'
          : 'hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {children}
    </button>
  );
}

// 데이터끼리 연결하는 내부 값이라 사용자가 정할 필요 없음 — 소문자·숫자·_ (API 규칙), 50자 이내.
function newKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
