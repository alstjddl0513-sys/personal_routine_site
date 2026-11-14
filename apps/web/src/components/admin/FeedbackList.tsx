'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import {
  FEEDBACK_CATEGORY_LABELS,
  type AdminFeedback,
  type FeedbackCategory,
} from '@repo/shared';
import { deleteFeedbackAsAdmin } from '../../lib/api';
import { ListConfirmDialog } from '../settings/lists/ListConfirmDialog';

interface Props {
  initial: AdminFeedback[];
}

// 카드 리스트. 테이블 대신 카드로 간 이유: 본문이 여러 줄인 텍스트가 주요
// 정보 밀도라 표 컬럼에 우겨넣으면 여백만 커짐. 삭제는 optimistic —
// confirm() 후 즉시 리스트에서 제거 + 실패 시 롤백.
export function FeedbackList({ initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [deleteTarget, setDeleteTarget] = useState<AdminFeedback | null>(null);

  function handleDelete(target: AdminFeedback) {
    setDeleteTarget(null);
    setError(null);
    const prev = rows;
    setRows((r) => r.filter((x) => x.id !== target.id));
    startTransition(async () => {
      try {
        await deleteFeedbackAsAdmin(target.id);
      } catch (err) {
        console.error(err);
        setError('삭제하지 못했어요. 잠시 후 다시 해보세요.');
        setRows(prev);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        아직 도착한 피드백이 없어요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
          {error}
        </div>
      ) : null}
      {rows.map((row) => (
        <article
          key={row.id}
          className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <header className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <CategoryBadge category={row.category} />
            <span className="text-zinc-400 dark:text-zinc-500">·</span>
            <span>{formatDateTime(row.createdAt)}</span>
            <span className="text-zinc-400 dark:text-zinc-500">·</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {row.nickname ?? '—'}
            </span>
            {row.email ? (
              <span className="text-zinc-400 dark:text-zinc-500">
                ({row.email})
              </span>
            ) : null}
            {row.version ? (
              <>
                <span className="text-zinc-400 dark:text-zinc-500">·</span>
                <span className="font-mono text-[11px]">v{row.version}</span>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setDeleteTarget(row)}
              disabled={isPending}
              aria-label="삭제"
              className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </header>
          <p className="whitespace-pre-wrap wrap-break-word text-sm text-zinc-800 dark:text-zinc-200">
            {row.body}
          </p>
        </article>
      ))}
      <ListConfirmDialog
        open={deleteTarget !== null}
        title="이 피드백을 삭제할까요?"
        body={
          <p className="line-clamp-3 whitespace-pre-wrap">{deleteTarget?.body}</p>
        }
        confirmLabel="삭제"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const CATEGORY_CLASS: Record<FeedbackCategory, string> = {
  bug: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  suggestion: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  other: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
};

function CategoryBadge({ category }: { category: FeedbackCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${CATEGORY_CLASS[category]}`}
    >
      {FEEDBACK_CATEGORY_LABELS[category]}
    </span>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}
