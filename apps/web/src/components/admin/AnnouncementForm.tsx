'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_KIND_LABELS,
  type Announcement,
  type AnnouncementKind,
  type CreateAnnouncementInput,
} from '@repo/shared';
import { Select } from '../ui/Select';
import {
  BUTTON_PRIMARY,
  BUTTON_SECONDARY,
  BUTTON_TEXT,
  POPOVER_INPUT,
} from '../jobs/cells/popover-style';
import { Field } from '../settings/lists/ListCard';
import { Checkbox } from './admin-ui';
import { UserPickerModal } from './UserPickerModal';

const KIND_OPTIONS = ANNOUNCEMENT_KINDS.map((k) => ({
  value: k,
  label: ANNOUNCEMENT_KIND_LABELS[k],
}));

// 비어 있을 때 [저장] — 흐린 숲색 대신 divider 바탕(시안)
const SAVE_DISABLED = 'disabled:cursor-default disabled:border-divider disabled:bg-divider disabled:text-icon-faint disabled:opacity-100';

interface Props {
  initial?: Announcement;
  pending: boolean;
  onSubmit: (input: CreateAnnouncementInput) => void;
  onCancel: () => void;
}

// 공지 생성/수정 공용 폼 — 목록 카드 안 thead 바탕 블록(카드 좌우 끝까지).
// datetime-local input은 로컬 시각으로 표시하고 서버엔 ISO(UTC)로 변환해 전달. 빈 값 = null(제한 없음).
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
    <div className="-mx-5 flex flex-col gap-3.5 border-b border-divider bg-thead px-5 pt-4.5 pb-5">
      <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-soft">종류</span>
          <Select
            value={kind}
            onChange={(v) => setKind(v as AnnouncementKind)}
            options={KIND_OPTIONS}
            disabled={pending}
            ariaLabel="종류"
            tone="rally"
            triggerSuffix={<ChevronDown className="ml-auto h-4 w-4 text-ink-muted" aria-hidden />}
            triggerClassName={`${POPOVER_INPUT} cursor-pointer justify-between px-3 text-[15px]`}
          />
        </div>
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 self-end text-sm text-ink">
          <Checkbox
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={pending}
          />
          사용자에게 보이기
        </label>
      </div>

      <Field label="제목">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          maxLength={200}
          className={`${POPOVER_INPUT} px-3 text-[15px]`}
        />
      </Field>
      <Field label="본문">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
          maxLength={4000}
          rows={4}
          className={`${POPOVER_INPUT} resize-y px-3 py-2 text-[15px] leading-[1.6]`}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="시작" hint="비우면 제한 없음">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            disabled={pending}
            className={`${POPOVER_INPUT} text-[14.5px]`}
          />
        </Field>
        <Field label="종료" hint="비우면 제한 없음">
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            disabled={pending}
            className={`${POPOVER_INPUT} text-[14.5px]`}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={pending}
          className={BUTTON_SECONDARY}
        >
          받는 사람 고르기
        </button>
        <span className="text-sm text-ink-muted">
          {targets.length === 0 ? '전체에게 보내요' : `${targets.length}명 지정`}
        </span>
        {targets.length > 0 ? (
          <button
            type="button"
            onClick={() => setTargets([])}
            disabled={pending}
            className={`${BUTTON_TEXT} -ml-1 px-2`}
          >
            전체로 되돌리기
          </button>
        ) : null}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={pending} className={BUTTON_SECONDARY}>
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !title.trim() || !body.trim()}
          className={`${BUTTON_PRIMARY} ${SAVE_DISABLED}`}
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
