'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_INPUT_BASE } from '../jobs/cells/popover-style';
import {
  AddLine,
  INPUT_ERROR,
  ListBody,
  ListCard,
  ListEmpty,
  ListError,
  ListRow,
  ROW_ACTION,
  RowAction,
  StatusBadge,
} from './lists/ListCard';
import { ListConfirmDialog } from './lists/ListConfirmDialog';

// 이름 하나짜리 목록 관리(회사 유형 · 학습 카테고리) — 두 화면이 같이 씀.
// 줄 안에서 이름 고치기(Enter 저장 · Esc 취소) · 삭제(확인 창), 카드 맨 아래 [+ 추가].
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
  /** 빈 상태 "아직 만든 유형이 없어요." */
  emptyText: string;
  /** 확인 창 제목(질문) — "'스타트업' 유형을 삭제할까요?" */
  deleteTitle: (label: string) => string;
  /** 확인 창 본문(결과) */
  deleteBody: string;
}

const INPUT = `${POPOVER_INPUT_BASE} flex-1 text-[15px]`;

export function LabelListManager<T extends LabelItem>({
  initial,
  keyPrefix,
  create,
  patch,
  remove,
  addLabel,
  placeholder,
  emptyText,
  deleteTitle,
  deleteBody,
}: LabelListManagerProps<T>) {
  const router = useRouter();
  const [rows, setRows] = useState<T[]>(initial);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  function beginEdit(row: T) {
    setEdits((prev) => ({ ...prev, [row.id]: row.label }));
    setEditError(null);
  }

  function cancelEdit(id: string) {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setEditError(null);
  }

  function saveEdit(row: T) {
    const draft = edits[row.id];
    if (draft === undefined) return;
    const label = draft.trim();
    if (!label) {
      setEditError('이름을 입력하세요.');
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
    <div className="flex flex-col gap-3">
      <ListError message={error} />

      <ListCard>
        {rows.length === 0 ? <ListEmpty>{emptyText}</ListEmpty> : null}
        <ListBody>
          {rows.map((row) => {
            const draft = edits[row.id];
            if (draft !== undefined) {
              return (
                <li key={row.id}>
                  <div className="flex min-h-14 flex-col justify-center gap-1 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={draft}
                        aria-label={`${row.label} 이름`}
                        aria-invalid={!!editError}
                        onChange={(e) => {
                          setEdits((prev) => ({ ...prev, [row.id]: e.target.value }));
                          setEditError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(row);
                          if (e.key === 'Escape') cancelEdit(row.id);
                        }}
                        disabled={isPending}
                        autoFocus
                        className={`${INPUT} mr-1 ${editError ? INPUT_ERROR : ''}`}
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(row)}
                        disabled={isPending}
                        aria-label="저장 (Enter)"
                        title="저장 (Enter)"
                        aria-keyshortcuts="Enter"
                        className={`${BUTTON_PRIMARY} h-10 w-10 px-0!`}
                      >
                        <Check className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => cancelEdit(row.id)}
                        disabled={isPending}
                        aria-label="취소 (Esc)"
                        title="취소 (Esc)"
                        aria-keyshortcuts="Escape"
                        className={`${ROW_ACTION} -mr-1.5`}
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    {editError ? <p className="text-[13px] text-alert">{editError}</p> : null}
                  </div>
                </li>
              );
            }
            return (
              <ListRow
                key={row.id}
                name={row.label}
                badges={row.isDefault ? <StatusBadge>기본</StatusBadge> : null}
                actions={
                  <>
                    <RowAction label={`${row.label} 이름 고치기`} title="이름 고치기" onClick={() => beginEdit(row)} disabled={isPending}>
                      <Pencil className="h-4 w-4" aria-hidden />
                    </RowAction>
                    <RowAction label={`${row.label} 삭제`} title="삭제" onClick={() => setDeleteTarget(row)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </RowAction>
                  </>
                }
              />
            );
          })}
        </ListBody>

        <AddRow
          keyPrefix={keyPrefix}
          create={create}
          addLabel={addLabel}
          placeholder={placeholder}
          onAdd={(row) => setRows((prev) => [...prev, row])}
          onError={setError}
        />
      </ListCard>

      <ListConfirmDialog
        open={!!deleteTarget}
        title={deleteTarget ? deleteTitle(deleteTarget.label) : ''}
        body={deleteBody}
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
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setLabel('');
    setOpen(false);
    setFieldError(null);
    onError(null);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const l = label.trim();
    if (!l) {
      setFieldError('이름을 입력하세요.');
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

  if (!open) return <AddLine label={addLabel} onClick={() => setOpen(true)} />;

  return (
    <form onSubmit={submit} className="flex flex-col gap-1 border-t border-divider py-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setFieldError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') reset();
          }}
          placeholder={placeholder}
          aria-label={addLabel}
          aria-invalid={!!fieldError}
          disabled={isPending}
          autoFocus
          className={`${INPUT} ${fieldError ? INPUT_ERROR : ''}`}
        />
        <button type="submit" disabled={isPending} className={BUTTON_PRIMARY}>
          {isPending ? '추가 중…' : '추가'}
        </button>
        <button type="button" onClick={reset} disabled={isPending} className={BUTTON_SECONDARY}>
          취소
        </button>
      </div>
      {fieldError ? <p className="text-[13px] text-alert">{fieldError}</p> : null}
    </form>
  );
}

// 데이터끼리 연결하는 내부 값이라 사용자가 정할 필요 없음 — 소문자·숫자·_ (API 규칙), 50자 이내.
function newKey(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
