'use client';

import { useEffect, useRef, useState } from 'react';
import { Ban } from 'lucide-react';
import {
  BAN_DURATION_HOURS,
  BAN_DURATION_LABELS,
  type AdminUserRow,
  type BanDurationHours,
} from '@repo/shared';
import { useOutsideClick } from '../../lib/useOutsideClick';

interface Props {
  open: boolean;
  target: AdminUserRow | null;
  pending: boolean;
  onConfirm: (durationHours: BanDurationHours) => void;
  onCancel: () => void;
}

// 사용자 차단 확인 모달. duration radio 4개. ConfirmDialog 대신 별도 컴포넌트인
// 이유는 duration 선택이 필요해서 (ConfirmDialog는 body 커스텀만 가능).

export function BanUserModal({
  open,
  target,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const [duration, setDuration] = useState<BanDurationHours>(24);
  const dialogRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dialogRef, () => !pending && onCancel(), open);

  // open transition에서 기간을 기본값(24)으로 리셋. React가 derived state
  // 리셋에 공식 권장하는 "adjust during render" 패턴 — ref는 렌더 중 접근
  // 금지라서 useState로 이전 값 추적.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) setDuration(24);
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, pending, onCancel]);

  if (!open || !target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-3 flex items-center gap-2">
          <Ban className="h-5 w-5 text-rose-600 dark:text-rose-400" aria-hidden />
          <h2 className="text-base font-semibold">사용자 차단</h2>
        </div>
        <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {target.nickname ?? target.email ?? target.id}
          </span>
          {' '}계정을 지정한 기간 동안 로그인하지 못하게 해요. 진행 중인 세션은
          토큰이 만료되기 전까지는 이어질 수 있어요.
        </p>
        <fieldset className="mb-4 flex flex-col gap-2">
          <legend className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            차단 기간
          </legend>
          {BAN_DURATION_HOURS.map((h) => (
            <label
              key={h}
              className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="radio"
                name="ban-duration"
                value={h}
                checked={duration === h}
                onChange={() => setDuration(h)}
                disabled={pending}
              />
              {BAN_DURATION_LABELS[h]}
            </label>
          ))}
        </fieldset>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded px-3 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 md:min-h-0 md:py-1.5 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(duration)}
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded bg-rose-600 px-3 text-sm text-white hover:bg-rose-700 disabled:opacity-50 md:min-h-0 md:py-1.5"
          >
            {pending ? '차단 중…' : '차단'}
          </button>
        </div>
      </div>
    </div>
  );
}
