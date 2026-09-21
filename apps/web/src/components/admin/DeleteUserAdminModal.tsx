'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { AdminUserRow } from '@repo/shared';

const CONFIRM_WORD = '삭제';

interface Props {
  open: boolean;
  target: AdminUserRow | null;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// 어드민이 다른 사용자 계정을 강제 탈퇴시키는 모달. AccountDeleteRow의
// self-delete 모달과 톤 유사하되 "다른 사용자"임을 강조.

export function DeleteUserAdminModal({
  open,
  target,
  pending,
  onConfirm,
  onCancel,
}: Props) {
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState('');
  const typedRef = useRef<HTMLInputElement>(null);

  // close transition에서 확인 상태를 지움. React가 derived state 리셋에
  // 공식 권장하는 "adjust during render" 패턴 — ref는 렌더 중 접근 금지라서
  // useState로 이전 값 추적.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setChecked(false);
      setTyped('');
    }
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

  const canConfirm = checked && typed.trim() === CONFIRM_WORD && !pending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
              aria-hidden
            />
            <h2 className="text-base font-semibold text-red-600 dark:text-red-400">
              사용자 강제 탈퇴
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !pending && onCancel()}
            disabled={pending}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {target.nickname ?? target.email ?? target.id}
            </span>
            {' '}계정과 이 사용자의 모든 데이터가{' '}
            <strong>영구히 삭제</strong>돼요. 복구 불가.
          </p>
          <ul className="ml-4 list-disc space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            <li>계정 · 프로필 · 닉네임</li>
            <li>채용 · 루틴 · 운동 · 블로그 · 학습 데이터 전부</li>
          </ul>

          <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={pending}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-zinc-300 accent-red-600 dark:border-zinc-600"
            />
            <span>이 사용자의 데이터를 영구 삭제하는 데 동의합니다.</span>
          </label>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 dark:text-zinc-400">
              정말 삭제하려면 아래에{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">
                {CONFIRM_WORD}
              </span>
              라고 입력하세요.
            </label>
            <input
              ref={typedRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={pending}
              autoComplete="off"
              className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-red-500 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-2">
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
              onClick={onConfirm}
              disabled={!canConfirm}
              className="inline-flex min-h-11 items-center gap-1 rounded bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:py-1.5"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {pending ? '삭제 중…' : '영구 삭제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
