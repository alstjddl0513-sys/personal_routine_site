'use client';

import { useMemo, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Trash2 } from 'lucide-react';
import type { Question, QuestionCategory } from '@repo/shared';
import {
  createQuestion,
  deleteQuestion,
  patchQuestion,
} from '../../lib/api';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_INPUT } from '../jobs/cells/popover-style';
import { ChipButton } from '../learn/CategoryFilterChips';
import { Select, type SelectOption } from '../ui/Select';
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
  RowAction,
  TagChip,
} from './lists/ListCard';
import { ListConfirmDialog } from './lists/ListConfirmDialog';
import { deleteConfirmTitle } from '../../lib/korean';

type Draft = {
  content: string;
  answer: string;
  tip: string;
  // 신규 추가 시엔 항상 실제 카테고리 key로 preselect. 편집 폼도 기존 row가
  // 카테고리를 가진 경우만 세팅 — '' 로 저장하지 않음(카테고리 없음 옵션 제거).
  categoryKey: string;
};

// AddRow가 초기 draft를 만들 때 categoryKey는 부모가 준 key로 override.
const EMPTY_DRAFT: Draft = { content: '', answer: '', tip: '', categoryKey: '' };

function draftFromQuestion(q: Question): Draft {
  return {
    content: q.content,
    answer: q.answer,
    tip: q.tip ?? '',
    categoryKey: q.categoryKey ?? '',
  };
}

type DraftError = { field: 'content' | 'answer'; message: string };

function validateDraft(d: Draft): DraftError | null {
  if (!d.content.trim()) return { field: 'content', message: '질문을 입력하세요.' };
  if (!d.answer.trim()) return { field: 'answer', message: '답변을 입력하세요.' };
  return null;
}

// 학습 질문 관리 (docs/design/rally-settings-docs*.html).
// 목록 위 "질문 N개"(고른 카테고리 기준) + 카테고리 칩, 카드 맨 위 [+ 질문 추가](새 질문이 위에 생김),
// 줄 = [카테고리 칩][질문 한 줄][⌄] … [삭제], 이름 쪽을 누르면 아래로 펼쳐 고치기.
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
  const [draftError, setDraftError] = useState<DraftError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<Question | null>(null);
  // 카테고리 필터 — 'all' 또는 카테고리 key. 질문이 많아져도 찾을 수 있게.
  const [filter, setFilter] = useState<string>('all');
  // 방금 추가한 질문 — 2.5초 강조
  const [flashId, setFlashId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const categoryOptions = useMemo<SelectOption[]>(
    () => categories.map((c) => ({ value: c.key, label: c.label })),
    [categories],
  );

  const categoryLabelByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.key, c.label);
    return map;
  }, [categories]);

  const filterChips = useMemo(
    () => [{ key: 'all', label: '전체' }, ...categories.map((c) => ({ key: c.key, label: c.label }))],
    [categories],
  );
  // 지운 카테고리를 보고 있었으면 전체로
  const activeFilter = filterChips.some((c) => c.key === filter) ? filter : 'all';
  const visibleRows = activeFilter === 'all' ? rows : rows.filter((r) => r.categoryKey === activeFilter);

  function beginEdit(row: Question) {
    setExpandedId(row.id);
    setDraft(draftFromQuestion(row));
    setDraftError(null);
    setError(null);
  }

  function cancelEdit() {
    setExpandedId(null);
    setDraft(null);
    setDraftError(null);
  }

  function saveEdit(row: Question) {
    if (!draft) return;
    const invalid = validateDraft(draft);
    if (invalid) {
      setDraftError(invalid);
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
        setError('고치지 못했어요. 잠시 후 다시 해보세요.');
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
        setError('삭제하지 못했어요. 잠시 후 다시 해보세요.');
        setConfirmDeleteRow(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.length === 0 ? null : (
        <>
          <p className="text-[15px] font-semibold text-ink-soft">
            질문 <span className="font-bold text-ink-strong">{visibleRows.length}개</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {filterChips.map((c) => (
              <ChipButton
                key={c.key}
                active={activeFilter === c.key}
                onClick={() => setFilter(c.key)}
                label={c.label}
              />
            ))}
          </div>
        </>
      )}

      <ListError message={error} />

      <ListCard>
        {/* 새 질문이 목록 맨 위에 생기니 추가 줄도 맨 위 */}
        <AddRow
          onAdd={(row) => {
            setRows((prev) => [row, ...prev]);
            setFlashId(row.id);
            // 다른 카테고리를 보고 있었으면 방금 추가한 질문이 안 보이니 전체로
            if (activeFilter !== 'all' && activeFilter !== row.categoryKey) setFilter('all');
          }}
          onError={setError}
          categoryOptions={categoryOptions}
          defaultCategoryKey={activeFilter !== 'all' ? activeFilter : categories[0]?.key ?? ''}
        />
        {visibleRows.length === 0 ? (
          <ListEmpty>
            {rows.length === 0
              ? '아직 추가한 질문이 없어요. 기본 질문은 오늘의 학습에 나와요.'
              : '이 카테고리엔 추가한 질문이 없어요.'}
          </ListEmpty>
        ) : null}
        <ListBody>
          {visibleRows.map((row) => {
            const isExpanded = expandedId === row.id;
            const categoryLabel = row.categoryKey
              ? categoryLabelByKey.get(row.categoryKey) ?? row.categoryKey
              : null;
            return (
              <li key={row.id}>
                <div
                  className={`-mx-3 flex min-h-14 items-center gap-3 rounded-md px-3 py-2 hover:bg-row-hover ${
                    flashId === row.id ? 'animate-[row-flash_2.5s_ease-out] motion-reduce:animate-none' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => (isExpanded ? cancelEdit() : beginEdit(row))}
                    aria-expanded={isExpanded}
                    title={row.content}
                    className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm text-left ${FOCUS_RING}`}
                  >
                    <span className="flex min-w-22 shrink-0 justify-center">
                      {categoryLabel ? <TagChip>{categoryLabel}</TagChip> : null}
                    </span>
                    <span className="min-w-0 truncate text-[15px] font-medium text-ink-strong">{row.content}</span>
                    <ChevronDown
                      aria-hidden
                      className={`h-4 w-4 shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div className="-mr-1.5 flex shrink-0 items-center">
                    <RowAction
                      label={`${shorten(row.content)} 삭제`}
                      title="삭제"
                      onClick={() => setConfirmDeleteRow(row)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </RowAction>
                  </div>
                </div>

                {isExpanded && draft ? (
                  <ExpandPanel>
                    <QuestionFields
                      draft={draft}
                      onChange={(d) => {
                        setDraft(d);
                        if (draftError) setDraftError(null);
                      }}
                      error={draftError}
                      isPending={isPending}
                      categoryOptions={categoryOptions}
                    />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={cancelEdit} disabled={isPending} className={BUTTON_SECONDARY}>
                        취소
                      </button>
                      <button type="button" onClick={() => saveEdit(row)} disabled={isPending} className={BUTTON_PRIMARY}>
                        {isPending ? '저장 중…' : '저장'}
                      </button>
                    </div>
                  </ExpandPanel>
                ) : null}
              </li>
            );
          })}
        </ListBody>
      </ListCard>

      <ListConfirmDialog
        open={!!confirmDeleteRow}
        title={deleteConfirmTitle(shorten(confirmDeleteRow?.content ?? ''))}
        body="이 질문에 남긴 이해완료 · 복습필요 기록도 함께 사라져요. 되돌릴 수 없어요."
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={() => confirmDeleteRow && performDelete(confirmDeleteRow)}
        onCancel={() => setConfirmDeleteRow(null)}
      />
    </div>
  );
}

const TEXTAREA = `${POPOVER_INPUT} min-h-0 resize-y py-2 text-[15px] leading-[1.6]`;

// 펼침 · 추가 칸 공통 — 질문 2줄 · 답변 5줄 · 꼬리 질문 2줄 · 카테고리(220px). 칸 사이 12px.
function QuestionFields({
  draft,
  onChange,
  error,
  isPending,
  categoryOptions,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  error: DraftError | null;
  isPending: boolean;
  categoryOptions: SelectOption[];
}) {
  const errOf = (k: DraftError['field']) => (error?.field === k ? error.message : null);
  return (
    <div className="flex flex-col gap-3">
      <Field label="질문" error={errOf('content')}>
        <textarea
          value={draft.content}
          onChange={(e) => onChange({ ...draft, content: e.target.value })}
          disabled={isPending}
          rows={2}
          maxLength={500}
          autoFocus
          placeholder="예: 프로세스와 스레드의 차이는?"
          aria-invalid={error?.field === 'content'}
          className={`${TEXTAREA} ${error?.field === 'content' ? INPUT_ERROR : ''}`}
        />
      </Field>
      <Field label="답변" error={errOf('answer')}>
        <textarea
          value={draft.answer}
          onChange={(e) => onChange({ ...draft, answer: e.target.value })}
          disabled={isPending}
          rows={5}
          maxLength={5000}
          placeholder="핵심을 요약해서 적어두면 나중에 다시 보기 편해요."
          aria-invalid={error?.field === 'answer'}
          className={`${TEXTAREA} ${error?.field === 'answer' ? INPUT_ERROR : ''}`}
        />
      </Field>
      <Field label="꼬리 질문" hint="선택">
        <textarea
          value={draft.tip}
          onChange={(e) => onChange({ ...draft, tip: e.target.value })}
          disabled={isPending}
          rows={2}
          maxLength={2000}
          placeholder="이어서 나올 만한 질문. 줄마다 하나씩"
          className={TEXTAREA}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-soft">카테고리</span>
        <Select
          value={draft.categoryKey}
          onChange={(v) => onChange({ ...draft, categoryKey: v })}
          options={categoryOptions}
          disabled={isPending}
          ariaLabel="카테고리"
          placeholder="카테고리 없음"
          triggerClassName={`${POPOVER_INPUT} w-55! cursor-pointer text-[15px]`}
        />
      </div>
    </div>
  );
}

function AddRow({
  onAdd,
  onError,
  categoryOptions,
  defaultCategoryKey,
}: {
  onAdd: (row: Question) => void;
  onError: (msg: string | null) => void;
  categoryOptions: SelectOption[];
  defaultCategoryKey: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initialDraft = useMemo<Draft>(
    () => ({ ...EMPTY_DRAFT, categoryKey: defaultCategoryKey }),
    [defaultCategoryKey],
  );
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [draftError, setDraftError] = useState<DraftError | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setDraft(initialDraft);
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
        onError('추가하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  if (!open) {
    return (
      <AddLine
        top
        label="질문 추가"
        onClick={() => {
          // 열 때마다 지금 보고 있는 카테고리로
          setDraft(initialDraft);
          setOpen(true);
        }}
      />
    );
  }

  return (
    <form onSubmit={submit}>
      <ExpandPanel first>
        <QuestionFields
          draft={draft}
          onChange={(d) => {
            setDraft(d);
            if (draftError) setDraftError(null);
          }}
          error={draftError}
          isPending={isPending}
          categoryOptions={categoryOptions}
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

// 확인 창 제목 · 스크린리더 이름에 넣을 질문 — 길면 앞부분만
function shorten(text: string, max = 40): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
