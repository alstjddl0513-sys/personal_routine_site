'use client';

import { useId, type ReactNode } from 'react';
import { SettingsDialog } from '../SettingsDialog';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '../../jobs/cells/popover-style';

// 목록 관리 확인 창 — 제목 = 질문, 본문 = 결과. 지우는 창은 [삭제] alert 채움,
// 지울 수 없는 창은 대신 할 동작([숨기기])이 숲색 채움.
export function ListConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = 'danger',
  pending,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const labelId = useId();
  return (
    <SettingsDialog
      open={open}
      title={title}
      labelId={labelId}
      onClose={onCancel}
      busy={pending}
      widthClass="md:max-w-120"
      compact
    >
      <div className="text-[15px] leading-relaxed text-ink-soft">{body}</div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={pending} className={BUTTON_SECONDARY}>
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={
            tone === 'danger'
              ? // 다크 alert는 밝아서 글자를 어두운 바탕색으로(공용 ConfirmDialog와 같음)
                'inline-flex min-h-10 cursor-pointer items-center justify-center rounded-md bg-alert px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 dark:text-paper'
              : BUTTON_PRIMARY
          }
        >
          {confirmLabel}
        </button>
      </div>
    </SettingsDialog>
  );
}
