'use client';

import { useId, useState } from 'react';
import type { AdminUserRow } from '@repo/shared';
import { SettingsDialog } from '../settings/SettingsDialog';
import { BUTTON_SECONDARY, POPOVER_INPUT_BASE } from '../jobs/cells/popover-style';
import { BUTTON_DANGER } from './admin-ui';

const CONFIRM_WORD = '삭제';

// 함께 지워지는 데이터 — 2열 상자(docs/design/rally-admin-parts.html)
const WIPED: [string, string][] = [
  ['계정', '프로필 · 닉네임'],
  ['채용', '회사 · 유형 · 일정 · 제출본'],
  ['루틴', '루틴 · 체크 · 회고 · 챌린지'],
  ['운동', '기록 · 종목 · 분할 · 주간 목표'],
  ['학습', '질문 · 카테고리 · 학습 기록'],
  ['블로그', '구독한 블로그 · 가져온 글'],
];

interface Props {
  open: boolean;
  target: AdminUserRow | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 어드민이 다른 사용자 계정을 강제 탈퇴시키는 창. 확인은 '삭제' 입력 한 번만.
export function DeleteUserAdminModal({
  open,
  target,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const labelId = useId();
  const inputId = useId();
  const [typed, setTyped] = useState('');

  // close transition에서 입력을 지움("adjust during render" 패턴).
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setTyped('');
  }

  const canConfirm = typed.trim() === CONFIRM_WORD && !pending;

  return (
    <SettingsDialog
      open={open && !!target}
      title="사용자 강제 탈퇴"
      labelId={labelId}
      onClose={onCancel}
      busy={pending}
      widthClass="md:max-w-135"
      compact
    >
      <p className="leading-relaxed text-ink-soft">
        <span className="font-semibold text-ink">
          {target?.nickname ?? target?.email ?? target?.id}
        </span>{' '}
        계정과 이 사용자의 모든 데이터가 <strong className="font-semibold text-ink">영구히 삭제</strong>돼요.
        되돌릴 수 없어요.
      </p>
      <dl className="grid grid-cols-2 gap-x-5 gap-y-2 rounded-md border border-divider bg-thead px-4 py-3 text-[13.5px]">
        {WIPED.map(([k, v]) => (
          <div key={k} className="flex min-w-0 gap-2">
            <dt className="shrink-0 font-semibold text-ink-soft">{k}</dt>
            <dd className="min-w-0 text-ink-muted">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm text-ink-soft">
          정말 삭제하려면 아래에 <strong className="font-semibold text-alert">{CONFIRM_WORD}</strong>
          라고 입력하세요.
        </label>
        <input
          id={inputId}
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={pending}
          autoComplete="off"
          className={`${POPOVER_INPUT_BASE} w-55 text-[15px]`}
        />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} disabled={pending} className={BUTTON_SECONDARY}>
          취소
        </button>
        <button type="button" onClick={onConfirm} disabled={!canConfirm} className={BUTTON_DANGER}>
          {pending ? '삭제 중…' : '영구 삭제'}
        </button>
      </div>
    </SettingsDialog>
  );
}
