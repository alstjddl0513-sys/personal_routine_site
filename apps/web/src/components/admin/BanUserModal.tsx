'use client';

import { useId, useState } from 'react';
import {
  BAN_DURATION_HOURS,
  BAN_DURATION_LABELS,
  type AdminUserRow,
  type BanDurationHours,
} from '@repo/shared';
import { SettingsDialog } from '../settings/SettingsDialog';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';
import { BUTTON_DANGER, Radio } from './admin-ui';

interface Props {
  open: boolean;
  target: AdminUserRow | null;
  pending: boolean;
  onConfirm: (durationHours: BanDurationHours) => void;
  onCancel: () => void;
}

// 사용자 차단 창 — 기간 라디오 4개(기본 1일). (docs/design/rally-admin-parts.html)
export function BanUserModal({
  open,
  target,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const labelId = useId();
  const [duration, setDuration] = useState<BanDurationHours>(24);

  // open transition에서 기간을 기본값(24)으로 리셋. React가 derived state
  // 리셋에 공식 권장하는 "adjust during render" 패턴.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setDuration(24);
  }

  return (
    <SettingsDialog
      open={open && !!target}
      title="사용자 차단"
      labelId={labelId}
      onClose={onCancel}
      busy={pending}
      widthClass="md:max-w-125"
      compact
    >
      <p className="leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">
          {target?.nickname ?? target?.email ?? target?.id}
        </span>{' '}
        계정을 지정한 기간 동안 로그인하지 못하게 해요. 이미 로그인한 기기에선 최대 1시간 더 쓸 수
        있어요.
      </p>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-soft">차단 기간</legend>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {BAN_DURATION_HOURS.map((h) => (
            <label
              key={h}
              className="inline-flex min-h-10 cursor-pointer items-center gap-2 pr-2.5 text-[14.5px] text-ink"
            >
              <Radio
                name="ban-duration"
                value={h}
                checked={duration === h}
                onChange={() => setDuration(h)}
                disabled={pending}
              />
              {BAN_DURATION_LABELS[h]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={pending} className={BUTTON_SECONDARY}>
          취소
        </button>
        <button
          type="button"
          onClick={() => onConfirm(duration)}
          disabled={pending}
          className={BUTTON_DANGER}
        >
          {pending ? '차단 중…' : '차단'}
        </button>
      </div>
    </SettingsDialog>
  );
}
