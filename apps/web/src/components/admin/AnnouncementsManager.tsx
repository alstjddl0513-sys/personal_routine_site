'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { ConfirmDialog } from '../ui/ConfirmDialog';
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
        setError('공지 생성에 실패했어요.');
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
        setError('공지 수정에 실패했어요.');
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
        setError('공지 삭제에 실패했어요.');
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

      {creating ? (
        <AnnouncementForm
          pending={isPending}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex w-fit items-center gap-1 rounded border border-dashed border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          공지 추가
        </button>
      )}

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
          아직 공지가 없어요. 위에서 새로 만들어보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="공지 삭제"
        description={
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {deleteTarget?.title}
            </span>
            {' '}공지를 삭제할까요? 이미 뜬 알림도 함께 사라져요.
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
  const readPct =
    row.stats.targets > 0
      ? Math.round((row.stats.reads / row.stats.targets) * 100)
      : 0;

  if (editing) {
    return (
      <li>
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
    <li className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon
          className={`mt-0.5 h-4 w-4 shrink-0 ${ANNOUNCEMENT_KIND_COLOR[row.kind]}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {row.title}
            </span>
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {getAnnouncementKindLabel(row.kind)}
            </span>
            {!row.isActive ? (
              <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                비활성
              </span>
            ) : null}
            <span className="text-[10px] text-zinc-400">
              {row.targetUserIds.length === 0
                ? '전체'
                : `${row.targetUserIds.length}명`}
            </span>
            <span
              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              title={
                row.stats.targets > 0
                  ? `${row.stats.reads}명 읽음 (${row.stats.targets}명 중)`
                  : '아직 대상 유저가 없어요'
              }
            >
              읽음 {row.stats.reads}/{row.stats.targets}
              {row.stats.targets > 0 ? ` · ${readPct}%` : ''}
            </span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {formatWindow(row.startsAt, row.endsAt)}
          </div>
          {expanded ? (
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {row.body}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            onClick={() => setExpanded((v) => !v)}
            disabled={false}
            label={expanded ? '접기' : '펼치기'}
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </IconButton>
          <IconButton onClick={onEdit} disabled={pending} label="편집">
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton onClick={onDelete} disabled={pending} label="삭제" danger>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>
    </li>
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

function formatWindow(startsAt: string | null, endsAt: string | null): string {
  if (!startsAt && !endsAt) return '기간 무제한';
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  if (startsAt && !endsAt) return `${fmt(startsAt)} ~`;
  if (!startsAt && endsAt) return `~ ${fmt(endsAt)}`;
  return `${fmt(startsAt!)} ~ ${fmt(endsAt!)}`;
}
