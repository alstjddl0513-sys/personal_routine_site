'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Question, QuestionCategory } from '@repo/shared';
import {
  createQuestion,
  deleteQuestion,
  patchQuestion,
} from '../../lib/api';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Select, type SelectOption } from '../ui/Select';

type Draft = {
  content: string;
  answer: string;
  tip: string;
  // '' = 미지정. 저장 시 null로 변환.
  categoryKey: string;
};

const ADD_DEFAULTS: Draft = { content: '', answer: '', tip: '', categoryKey: '' };

function draftFromQuestion(q: Question): Draft {
  return {
    content: q.content,
    answer: q.answer,
    tip: q.tip ?? '',
    categoryKey: q.categoryKey ?? '',
  };
}

function validateDraft(d: Draft): string | null {
  if (!d.content.trim()) return '질문을 입력하세요.';
  if (!d.answer.trim()) return '답변을 입력하세요.';
  return null;
}

export function QuestionsManager({
  initial,
  categories,
}: {
  initial: Question[];
  categories: QuestionCategory[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Question[]>(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<Question | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: '카테고리 없음' },
      ...categories.map((c) => ({ value: c.key, label: c.label })),
    ],
    [categories],
  );

  const categoryLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.key, c.label);
    return map;
  }, [categories]);

  function beginEdit(row: Question) {
    setExpandedId(row.id);
    setDraft(draftFromQuestion(row));
    setError(null);
  }

  function cancelEdit() {
    setExpandedId(null);
    setDraft(null);
    setError(null);
  }

  function saveEdit(row: Question) {
    if (!draft) return;
    const msg = validateDraft(draft);
    if (msg) {
      setError(msg);
      return;
    }
    const patch = {
      content: draft.content.trim(),
      answer: draft.answer.trim(),
      tip: draft.tip.trim() || null,
      categoryKey: draft.categoryKey || null,
    };
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchQuestion(row.id, patch);
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        cancelEdit();
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('수정에 실패했습니다.');
      }
    });
  }

  function performDelete(row: Question) {
    startTransition(async () => {
      try {
        await deleteQuestion(row.id);
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setConfirmDeleteRow(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('삭제에 실패했습니다.');
        setConfirmDeleteRow(null);
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
            const isExpanded = expandedId === row.id;
            const categoryLabel = row.categoryKey
              ? categoryLabelByKey.get(row.categoryKey) ?? row.categoryKey
              : null;
            return (
              <li key={row.id}>
                <div className="flex items-center gap-2 px-3 py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => (isExpanded ? cancelEdit() : beginEdit(row))}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                    )}
                    {categoryLabel ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {categoryLabel}
                      </span>
                    ) : null}
                    <span className="line-clamp-1 min-w-0 flex-1 text-zinc-800 dark:text-zinc-200">
                      {row.content}
                    </span>
                  </button>

                  <IconButton
                    onClick={() => setConfirmDeleteRow(row)}
                    disabled={isPending}
                    label="삭제"
                    danger
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                </div>

                {isExpanded && draft ? (
                  <EditForm
                    draft={draft}
                    onChange={setDraft}
                    onSave={() => saveEdit(row)}
                    onCancel={cancelEdit}
                    isPending={isPending}
                    categoryOptions={categoryOptions}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>

        <AddRow
          onAdd={(row) => setRows((prev) => [row, ...prev])}
          onError={setError}
          categoryOptions={categoryOptions}
        />
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        여기에 추가한 질문은 곧바로 <strong>오늘의 학습</strong> 풀에 섞여요.
        기본 제공 질문은 이 목록에 뜨지 않고 학습 페이지에서만 등장해요.
      </p>

      <ConfirmDialog
        open={!!confirmDeleteRow}
        title="질문 삭제"
        description={
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              &ldquo;{confirmDeleteRow?.content}&rdquo;
            </span>
            를 삭제할까요? 이 질문에 남긴 <strong>이해완료·복습필요 기록도 함께 사라져요</strong>.
            되돌릴 수 없어요.
          </p>
        }
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={() => confirmDeleteRow && performDelete(confirmDeleteRow)}
        onCancel={() => setConfirmDeleteRow(null)}
      />
    </div>
  );
}

function EditForm({
  draft,
  onChange,
  onSave,
  onCancel,
  isPending,
  categoryOptions,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  categoryOptions: SelectOption[];
}) {
  return (
    <div className="border-t border-zinc-100 bg-zinc-50/50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-3">
        <Field label="질문">
          <textarea
            value={draft.content}
            onChange={(e) => onChange({ ...draft, content: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancel();
            }}
            disabled={isPending}
            rows={2}
            maxLength={1000}
            autoFocus
            className="resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
        <Field label="답변">
          <textarea
            value={draft.answer}
            onChange={(e) => onChange({ ...draft, answer: e.target.value })}
            disabled={isPending}
            rows={5}
            maxLength={5000}
            className="resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
        <Field label="꼬리 질문 (선택)">
          <textarea
            value={draft.tip}
            onChange={(e) => onChange({ ...draft, tip: e.target.value })}
            disabled={isPending}
            rows={3}
            maxLength={2000}
            placeholder="답을 열어본 뒤 이어질 만한 후속 질문 1~2개. 줄바꿈으로 구분."
            className="resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </Field>
        <Field label="카테고리">
          <div>
            <Select
              value={draft.categoryKey}
              onChange={(v) => onChange({ ...draft, categoryKey: v })}
              options={categoryOptions}
              disabled={isPending}
              ariaLabel="카테고리"
              placeholder="카테고리 없음"
              triggerClassName="w-fit min-w-40 cursor-pointer rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>
        </Field>
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
  categoryOptions,
}: {
  onAdd: (row: Question) => void;
  onError: (msg: string | null) => void;
  categoryOptions: SelectOption[];
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
        const created = await createQuestion({
          content: draft.content.trim(),
          answer: draft.answer.trim(),
          tip: draft.tip.trim() || null,
          categoryKey: draft.categoryKey || null,
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
          질문 추가
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 border-t border-zinc-100 bg-zinc-50/50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <Field label="질문">
        <textarea
          value={draft.content}
          onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          disabled={isPending}
          rows={2}
          maxLength={1000}
          autoFocus
          placeholder="예: 프로세스와 스레드의 차이는?"
          className="resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>
      <Field label="답변">
        <textarea
          value={draft.answer}
          onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
          disabled={isPending}
          rows={5}
          maxLength={5000}
          placeholder="핵심을 요약해서 적어두면 나중에 다시 보기 편해요."
          className="resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>
      <Field label="꼬리 질문 (선택)">
        <textarea
          value={draft.tip}
          onChange={(e) => setDraft({ ...draft, tip: e.target.value })}
          disabled={isPending}
          rows={3}
          maxLength={2000}
          placeholder="답을 열어본 뒤 이어질 만한 후속 질문 1~2개. 줄바꿈으로 구분."
          className="resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950"
        />
      </Field>
      <Field label="카테고리">
        <div>
          <Select
            value={draft.categoryKey}
            onChange={(v) => setDraft({ ...draft, categoryKey: v })}
            options={categoryOptions}
            disabled={isPending}
            ariaLabel="카테고리"
            placeholder="카테고리 없음"
            triggerClassName="w-fit min-w-40 cursor-pointer rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
        </div>
      </Field>
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
