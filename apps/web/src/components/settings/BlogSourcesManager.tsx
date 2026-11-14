'use client';

import { useState, useTransition, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Trash2 } from 'lucide-react';
import type { BlogSource } from '@repo/shared';
import {
  createBlogSource,
  deleteBlogSource,
  patchBlogSource,
} from '../../lib/api';
import { BUTTON_PRIMARY, BUTTON_SECONDARY, POPOVER_INPUT } from '../jobs/cells/popover-style';
import {
  AddLine,
  ExpandPanel,
  Field,
  INPUT_ERROR,
  ListBody,
  ListCard,
  ListEmpty,
  ListError,
  ListRow,
  RowAction,
  StatusBadge,
} from './lists/ListCard';
import { ListConfirmDialog } from './lists/ListConfirmDialog';
import { deleteConfirmTitle } from '../../lib/korean';

type Draft = {
  name: string;
  rssUrl: string;
  siteUrl: string;
};

const ADD_DEFAULTS: Draft = { name: '', rssUrl: '', siteUrl: '' };

function draftFromSource(s: BlogSource): Draft {
  return {
    name: s.name,
    rssUrl: s.rssUrl,
    siteUrl: s.siteUrl ?? '',
  };
}

type DraftError = { field: keyof Draft; message: string };

function validateDraft(d: Draft): DraftError | null {
  if (!d.name.trim()) return { field: 'name', message: '이름을 입력하세요.' };
  const url = d.rssUrl.trim();
  if (!url) return { field: 'rssUrl', message: 'RSS 주소를 입력하세요.' };
  if (!/^https?:\/\//i.test(url))
    return { field: 'rssUrl', message: 'RSS 주소는 http:// 또는 https://로 시작해야 해요.' };
  const site = d.siteUrl.trim();
  if (site && !/^https?:\/\//i.test(site))
    return { field: 'siteUrl', message: '사이트 주소는 http:// 또는 https://로 시작해야 해요.' };
  return null;
}

// RSS 주소는 고정폭 글꼴(ui-monospace)
const MONO = 'font-[ui-monospace,SFMono-Regular,Menlo,monospace]';

// 일시중지 — lucide Pause는 속 빈 사각형 두 개라 시안처럼 세로선 두 개로
function PauseLines() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M9 5.5v13M15 5.5v13" />
    </svg>
  );
}

export function BlogSourcesManager({ initial }: { initial: BlogSource[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<BlogSource[]>(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftError, setDraftError] = useState<DraftError | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<BlogSource | null>(null);
  const [isPending, startTransition] = useTransition();

  function beginEdit(row: BlogSource) {
    setExpandedId(row.id);
    setDraft(draftFromSource(row));
    setDraftError(null);
    setError(null);
  }

  function cancelEdit() {
    setExpandedId(null);
    setDraft(null);
    setDraftError(null);
  }

  function saveEdit(row: BlogSource) {
    if (!draft) return;
    const invalid = validateDraft(draft);
    if (invalid) {
      setDraftError(invalid);
      return;
    }
    const patch = {
      name: draft.name.trim(),
      rssUrl: draft.rssUrl.trim(),
      siteUrl: draft.siteUrl.trim() || null,
    };
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchBlogSource(row.id, patch);
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        cancelEdit();
        router.refresh();
      } catch (err) {
        console.error(err);
        setDraftError({ field: 'rssUrl', message: '고치지 못했어요. 주소를 확인하고 다시 해보세요.' });
      }
    });
  }

  function toggleActive(row: BlogSource) {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchBlogSource(row.id, { isActive: !row.isActive });
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)));
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('바꾸지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function performDelete(row: BlogSource) {
    startTransition(async () => {
      try {
        await deleteBlogSource(row.id);
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
    <div className="flex flex-col gap-3">
      <ListError message={error} />

      <ListCard>
        {rows.length === 0 ? <ListEmpty>아직 구독한 블로그가 없어요.</ListEmpty> : null}
        <ListBody>
          {rows.map((row) => {
            const isExpanded = expandedId === row.id;
            const paused = !row.isActive;
            return (
              <ListRow
                key={row.id}
                name={row.name}
                dimmed={paused}
                badges={paused ? <StatusBadge>일시중지됨</StatusBadge> : null}
                sub={<span className={`block max-w-110 truncate text-[12.5px] ${MONO}`}>{row.rssUrl}</span>}
                expand={{
                  open: isExpanded,
                  onToggle: () => (isExpanded ? cancelEdit() : beginEdit(row)),
                  label: `${row.name} 고치기`,
                }}
                actions={
                  <>
                    <RowAction
                      label={paused ? `${row.name} 다시 받기` : `${row.name} 일시중지`}
                      title={paused ? '다시 받기' : '일시중지 — 새 글을 잠시 안 가져와요. 가져온 글은 남아요'}
                      onClick={() => toggleActive(row)}
                      disabled={isPending}
                    >
                      {paused ? <Play className="h-4 w-4" aria-hidden /> : <PauseLines />}
                    </RowAction>
                    <RowAction label={`${row.name} 삭제`} title="삭제" onClick={() => setConfirmDeleteRow(row)} disabled={isPending}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </RowAction>
                  </>
                }
                panel={
                  isExpanded && draft ? (
                    <ExpandPanel>
                      <BlogFields
                        draft={draft}
                        onChange={setDraft}
                        error={draftError}
                        onClearError={() => setDraftError(null)}
                        isPending={isPending}
                        onEnter={() => saveEdit(row)}
                        onEscape={cancelEdit}
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
                  ) : null
                }
              />
            );
          })}
        </ListBody>

        <AddRow onAdd={(row) => setRows((prev) => [...prev, row])} onError={setError} />
      </ListCard>

      <ListConfirmDialog
        open={!!confirmDeleteRow}
        title={deleteConfirmTitle(confirmDeleteRow?.name ?? '')}
        body="이 블로그에서 가져온 글도 전부 함께 사라져요. 되돌릴 수 없어요."
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={() => confirmDeleteRow && performDelete(confirmDeleteRow)}
        onCancel={() => setConfirmDeleteRow(null)}
      />
    </div>
  );
}

// 펼침 · 추가 칸 공통 — 이름 · RSS 주소 / 사이트 주소(grid 1fr 1.6fr)
function BlogFields({
  draft,
  onChange,
  error,
  onClearError,
  isPending,
  onEnter,
  onEscape,
  placeholders,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  error: DraftError | null;
  onClearError: () => void;
  isPending: boolean;
  onEnter?: () => void;
  onEscape: () => void;
  placeholders?: Partial<Record<keyof Draft, string>>;
}) {
  const set = (k: keyof Draft, v: string) => {
    onChange({ ...draft, [k]: v });
    if (error) onClearError();
  };
  const keys = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) onEnter();
    if (e.key === 'Escape') onEscape();
  };
  const errOf = (k: keyof Draft) => (error?.field === k ? error.message : null);
  const cls = (k: keyof Draft, extra = '') => `${POPOVER_INPUT} ${extra} ${error?.field === k ? INPUT_ERROR : ''}`;
  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 md:grid-cols-[1fr_1.6fr]">
      <Field label="이름" error={errOf('name')}>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          onKeyDown={keys}
          disabled={isPending}
          maxLength={100}
          autoFocus
          placeholder={placeholders?.name}
          aria-invalid={error?.field === 'name'}
          className={cls('name', 'text-[15px]')}
        />
      </Field>
      <Field label="RSS 주소" error={errOf('rssUrl')}>
        <input
          type="url"
          value={draft.rssUrl}
          onChange={(e) => set('rssUrl', e.target.value)}
          onKeyDown={keys}
          disabled={isPending}
          maxLength={500}
          placeholder={placeholders?.rssUrl ?? 'https://...'}
          aria-invalid={error?.field === 'rssUrl'}
          className={cls('rssUrl', `text-[13.5px] ${MONO}`)}
        />
      </Field>
      <Field label="사이트 주소" hint="선택" error={errOf('siteUrl')}>
        <input
          type="url"
          value={draft.siteUrl}
          onChange={(e) => set('siteUrl', e.target.value)}
          onKeyDown={keys}
          disabled={isPending}
          maxLength={500}
          placeholder={placeholders?.siteUrl ?? 'https://...'}
          aria-invalid={error?.field === 'siteUrl'}
          className={cls('siteUrl', 'text-[15px]')}
        />
      </Field>
    </div>
  );
}

function AddRow({
  onAdd,
  onError,
}: {
  onAdd: (row: BlogSource) => void;
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

  function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const invalid = validateDraft(draft);
    if (invalid) {
      setDraftError(invalid);
      return;
    }
    onError(null);
    startTransition(async () => {
      try {
        const created = await createBlogSource({
          name: draft.name.trim(),
          rssUrl: draft.rssUrl.trim(),
          siteUrl: draft.siteUrl.trim() || undefined,
        });
        onAdd(created);
        reset();
        router.refresh();
      } catch (err) {
        console.error(err);
        // 실패 원인이 대개 주소(중복 · 형식)라 RSS 칸 아래에 붙임
        setDraftError({ field: 'rssUrl', message: '추가하지 못했어요. 주소를 확인하고 다시 해보세요.' });
      }
    });
  }

  if (!open) return <AddLine label="블로그 추가" onClick={() => setOpen(true)} />;

  return (
    <form onSubmit={submit}>
      <ExpandPanel last>
        <BlogFields
          draft={draft}
          onChange={setDraft}
          error={draftError}
          onClearError={() => setDraftError(null)}
          isPending={isPending}
          onEscape={reset}
          placeholders={{ name: '예: 카카오 tech', rssUrl: 'https://example.com/feed', siteUrl: 'https://example.com' }}
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
