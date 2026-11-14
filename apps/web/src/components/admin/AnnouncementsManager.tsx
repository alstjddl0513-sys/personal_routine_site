'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  type AdminAnnouncement,
  type CreateAnnouncementInput,
  type UpdateAnnouncementInput,
} from '@repo/shared';
import {
  createAnnouncement,
  deleteAnnouncement,
  patchAnnouncement,
} from '../../lib/api';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';
import { RowAction, StatusBadge } from '../settings/lists/ListCard';
import { ListConfirmDialog } from '../settings/lists/ListConfirmDialog';
import { deleteConfirmTitle } from '../../lib/korean';
import { AdminError, DotBadge, formatShortDateTime } from './admin-ui';
import {
  ANNOUNCEMENT_KIND_COLOR,
  ANNOUNCEMENT_KIND_ICON,
  getAnnouncementKindLabel,
} from '../../lib/announcement-kind';
import { AnnouncementForm } from './AnnouncementForm';

interface Props {
  initial: AdminAnnouncement[];
}

export function AnnouncementsManager({ initial }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<AdminAnnouncement[]>(initial);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate(input: CreateAnnouncementInput) {
    setError(null);
    startTransition(async () => {
      try {
        const created = await createAnnouncement(input);
        setRows((prev) => [created, ...prev]);
        setCreating(false);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('공지를 만들지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function handleUpdate(id: string, input: UpdateAnnouncementInput) {
    setError(null);
    startTransition(async () => {
      try {
        const updated = await patchAnnouncement(id, input);
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setEditingId(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('공지를 저장하지 못했어요. 잠시 후 다시 해보세요.');
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setError(null);
    startTransition(async () => {
      try {
        await deleteAnnouncement(target.id);
        setRows((prev) => prev.filter((r) => r.id !== target.id));
        setDeleteTarget(null);
        router.refresh();
      } catch (err) {
        console.error(err);
        setError('공지를 삭제하지 못했어요. 잠시 후 다시 해보세요.');
        setDeleteTarget(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={`${BUTTON_PRIMARY} gap-1.5 pr-4 pl-3.5`}
        >
          <Plus className="h-4 w-4" aria-hidden />
          공지 추가
        </button>
      </div>

      <AdminError message={error} />

      <div className="overflow-hidden rounded-lg border border-line bg-surface px-5">
        {rows.length === 0 && !creating ? (
          <p className="py-7 text-center text-[15px] text-ink-soft">
            아직 공지가 없어요. 위에서 새로 만들어보세요.
          </p>
        ) : (
          <ul className="flex flex-col [&>li]:border-b [&>li]:border-divider [&>li:last-child]:border-b-0">
            {creating ? (
              <li className="border-b-0!">
                <AnnouncementForm
                  pending={isPending}
                  onSubmit={handleCreate}
                  onCancel={() => setCreating(false)}
                />
              </li>
            ) : null}
            {rows.map((row) => (
              <AnnouncementRow
                key={row.id}
                row={row}
                editing={editingId === row.id}
                pending={isPending}
                onEdit={() => setEditingId(row.id)}
                onCancelEdit={() => setEditingId(null)}
                onUpdate={(input) => handleUpdate(row.id, input)}
                onDelete={() => setDeleteTarget(row)}
              />
            ))}
          </ul>
        )}
      </div>

      <ListConfirmDialog
        open={!!deleteTarget}
        title={deleteConfirmTitle(deleteTarget?.title ?? '')}
        body="이미 뜬 알림도 함께 사라져요."
        confirmLabel={isPending ? '삭제 중…' : '삭제'}
        pending={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function AnnouncementRow({
  row,
  editing,
  pending,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
}: {
  row: AdminAnnouncement;
  editing: boolean;
  pending: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onUpdate: (input: UpdateAnnouncementInput) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ANNOUNCEMENT_KIND_ICON[row.kind];
  const color = ANNOUNCEMENT_KIND_COLOR[row.kind];
  const { reads, targets } = row.stats;
  const readPct = targets > 0 ? `${Math.round((reads / targets) * 100)}%` : '—';

  if (editing) {
    return (
      <li className="border-b-0!">
        <AnnouncementForm
          initial={row}
          pending={pending}
          onSubmit={onUpdate}
          onCancel={onCancelEdit}
        />
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-start gap-3 py-3">
        <Icon className={`mt-2 h-4.5 w-4.5 shrink-0 ${color.text}`} strokeWidth={1.8} aria-hidden />
        <div className="flex min-w-0 flex-auto flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-[15px] font-semibold ${row.isActive ? 'text-ink' : 'text-ink-muted'}`}>
              {row.title}
            </span>
            <DotBadge text={color.text} border={color.border} dot={color.dot}>
              {getAnnouncementKindLabel(row.kind)}
            </DotBadge>
            {!row.isActive ? <StatusBadge>숨김</StatusBadge> : null}
          </span>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-ink-muted">
            <span>{formatWindow(row.startsAt, row.endsAt)}</span>
            <span aria-hidden>·</span>
            <span>
              받는 사람{' '}
              {row.targetUserIds.length === 0 ? '전체' : `${row.targetUserIds.length}명`}
            </span>
            <span aria-hidden>·</span>
            <span title={targets > 0 ? undefined : '받을 사람이 아직 없어요'}>
              읽음 {reads}/{targets} · {readPct}
            </span>
          </span>
        </div>
        <span className="-mr-1.5 flex shrink-0 gap-0.5">
          <RowAction
            label={`${row.title} ${expanded ? '접기' : '펼치기'}`}
            title={expanded ? '접기' : '펼치기'}
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown
              className={`h-4.5 w-4.5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              strokeWidth={1.8}
              aria-hidden
            />
          </RowAction>
          <RowAction label={`${row.title} 편집`} title="편집" onClick={onEdit} disabled={pending}>
            <Pencil className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
          </RowAction>
          <RowAction label={`${row.title} 삭제`} title="삭제" onClick={onDelete} disabled={pending}>
            <Trash2 className="h-4.5 w-4.5" strokeWidth={1.8} aria-hidden />
          </RowAction>
        </span>
      </div>
      {expanded ? (
        <div className="-mx-5 border-t border-divider bg-thead px-5 pt-3.5 pb-4.5 text-sm leading-[1.65] whitespace-pre-line text-ink-soft">
          {row.body}
        </div>
      ) : null}
    </li>
  );
}

function formatWindow(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return '기간 제한 없음';
  if (startsAt && !endsAt) return `${formatShortDateTime(startsAt)} ~`;
  if (!startsAt && endsAt) return `~ ${formatShortDateTime(endsAt)}`;
  return `${formatShortDateTime(startsAt!)} ~ ${formatShortDateTime(endsAt!)}`;
}
