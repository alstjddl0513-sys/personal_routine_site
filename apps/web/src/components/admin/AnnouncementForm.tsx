'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import {
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_KIND_LABELS,
  type Announcement,
  type AnnouncementKind,
  type CreateAnnouncementInput,
} from '@repo/shared';
import { Select } from '../ui/Select';
import { UserPickerModal } from './UserPickerModal';

const KIND_OPTIONS = ANNOUNCEMENT_KINDS.map((k) => ({
  value: k,
  label: ANNOUNCEMENT_KIND_LABELS[k],
}));

interface Props {
  initial?: Announcement;
  pending: boolean;
  onSubmit: (input: CreateAnnouncementInput) => void;
  onCancel: () => void;
}

// 공지 생성/수정 공용 폼. datetime-local input은 로컬 시각으로 표시하고
// 서버엔 ISO(UTC)로 변환해 전달. 빈 값 = null(무제한).

export function AnnouncementForm({ initial, pending, onSubmit, onCancel }: Props) {
  const [kind, setKind] = useState<AnnouncementKind>(initial?.kind ?? 'notice');
  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [startsAt, setStartsAt] = useState(toLocalInput(initial?.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial?.endsAt));
  const [targets, setTargets] = useState<string[]>(initial?.targetUserIds ?? []);
  const [pickerOpen, setPickerOpen] = useState(false);

  function submit() {
    if (!title.trim() || !body.trim()) return;
    onSubmit({
      kind,
      title: title.trim(),
      body: body.trim(),
      isActive,
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      targetUserIds: targets,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-zinc-500">종류</label>
        <Select
          value={kind}
          onChange={(v) => setKind(v as AnnouncementKind)}
          options={KIND_OPTIONS}
          disabled={pending}
          ariaLabel="종류"
          triggerClassName="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <label className="ml-auto flex items-center gap-1 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={pending}
          />
          활성
        </label>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목"
        disabled={pending}
        maxLength={200}
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="본문"
        disabled={pending}
        maxLength={4000}
        rows={4}
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <label className="flex items-center gap-1">
          시작
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={pending}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex items-center gap-1">
          종료
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={pending}
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <span className="text-[10px] text-zinc-400">비우면 무제한</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded border border-zinc-300 bg-white px-2 py-1 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <Users className="h-3.5 w-3.5" aria-hidden />
          타겟 지정
        </button>
        <span className="text-zinc-500">
          {targets.length === 0 ? '전체 사용자 대상' : `${targets.length}명 지정`}
        </span>
        {targets.length > 0 ? (
          <button
            type="button"
            onClick={() => setTargets([])}
            disabled={pending}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            초기화
          </button>
        ) : null}
      </div>

      <div className="mt-1 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !title.trim() || !body.trim()}
          className="rounded bg-zinc-900 px-3 py-1.5 text-xs text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>

      <UserPickerModal
        open={pickerOpen}
        initialSelected={targets}
        onConfirm={(ids) => {
          setTargets(ids);
          setPickerOpen(false);
        }}
        onCancel={() => setPickerOpen(false)}
      />
    </div>
  );
}

// ISO(UTC) → datetime-local input value (로컬 시각, seconds/ms 제거)
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60_000;
  const local = new Date(d.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}
