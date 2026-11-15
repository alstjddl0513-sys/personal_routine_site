'use client';

import { useState, useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import {
  FEEDBACK_CATEGORY_LABELS,
  type AdminFeedback,
  type FeedbackCategory,
} from '@repo/shared';
import { deleteFeedbackAsAdmin } from '../../lib/api';
import { RowAction } from '../settings/lists/ListCard';
import { ListConfirmDialog } from '../settings/lists/ListConfirmDialog';
import { AdminError, DotBadge, formatShortDateTime } from './admin-ui';

interface Props {
  initial: AdminFeedback[];
}

// 분류 3색: 버그 = alert · 제안 = 시험 파랑(캘린더 색 재사용) · 기타 = ink-muted. 점 + 테두리 + 글자.
const CATEGORY_COLOR: Record<FeedbackCategory, { text: string; border: string; dot: string }> = {
  bug: { text: 'text-alert', border: 'border-alert', dot: 'bg-alert' },
  suggestion: { text: 'text-ev-test', border: 'border-ev-test', dot: 'bg-ev-test' },
  other: { text: 'text-ink-muted', border: 'border-ink-muted', dot: 'bg-ink-muted' },
};

// 카드 리스트(docs/design/rally-admin*.html). 테이블 대신 카드로 간 이유: 본문이 여러 줄인
// 텍스트가 주요 정보 밀도라 표 컬럼에 우겨넣으면 여백만 커짐. 삭제는 optimistic —
// 확인 창 뒤 즉시 리스트에서 제거 + 실패 시 롤백.
export function FeedbackList({ initial }: Props) {
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
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

  return (
    <div className="flex flex-col gap-3">
      <AdminError message={error} />
      {rows.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-5 py-7 text-center text-[15px] text-ink-soft">
          아직 도착한 피드백이 없어요.
        </p>
      ) : (
        rows.map((row) => <FeedbackCard key={row.id} row={row} onDelete={() => setDeleteTarget(row)} />)
      )}
      <ListConfirmDialog
        open={deleteTarget !== null}
        title="이 피드백을 삭제할까요?"
        body={
          <p className="line-clamp-3 rounded-md border border-divider bg-thead px-3.5 py-2.5 text-sm whitespace-pre-line">
            {deleteTarget?.body}
          </p>
        }
        confirmLabel="삭제"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function FeedbackCard({ row, onDelete }: { row: AdminFeedback; onDelete: () => void }) {
  const color = CATEGORY_COLOR[row.category];
  return (
    <article className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface px-5 pt-4 pb-4.5">
      <div className="flex items-start gap-2.5">
        <div className="flex min-w-0 flex-auto flex-wrap items-center gap-x-2.5 gap-y-2">
          <DotBadge text={color.text} border={color.border} dot={color.dot}>
            {FEEDBACK_CATEGORY_LABELS[row.category]}
          </DotBadge>
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
            <span>{formatShortDateTime(row.createdAt)}</span>
            <span aria-hidden>·</span>
            <span className="font-semibold text-ink-soft">{row.nickname ?? '—'}</span>
            {row.email ? <span className="min-w-0 truncate">({row.email})</span> : null}
            {row.version ? (
              <>
                <span aria-hidden>·</span>
                <span>v{row.version}</span>
              </>
            ) : null}
          </span>
        </div>
        <span className="-my-2 -mr-1.5 shrink-0">
          <RowAction label={`${row.nickname ?? ''} 피드백 삭제`.trim()} title="삭제" onClick={onDelete}>
            <Trash2 className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
          </RowAction>
        </span>
      </div>
      <p className="text-[14.5px] leading-[1.65] wrap-break-word whitespace-pre-line text-ink">{row.body}</p>
    </article>
  );
}
