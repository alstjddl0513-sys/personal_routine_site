'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { deleteMyAccount } from '@/lib/api';

const CONFIRM_WORD = '삭제';

export function AccountDeleteRow() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4 text-red-500 dark:text-red-400" aria-hidden />
        <div className="flex-1">
          <div className="text-sm font-medium text-red-600 dark:text-red-400">
            계정 삭제
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            계정과 모든 기록을 지워요. 한 번 삭제하면 되돌릴 수 없어요.
          </p>
        </div>
      </button>

      {open ? <AccountDeleteModal onRequestClose={() => setOpen(false)} /> : null}
    </>
  );
}

function AccountDeleteModal({ onRequestClose }: { onRequestClose: () => void }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const typedRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onRequestClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPending, onRequestClose]);

  const canConfirm = checked && typed.trim() === CONFIRM_WORD && !isPending;

  function confirmDelete() {
    if (!canConfirm) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteMyAccount();
        // 서버가 auth.users를 지웠으므로 현재 세션은 무효. 클라이언트도
        // 명시적으로 signOut 해서 쿠키·로컬 스토리지 정리 후 /login.
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut().catch(() => {});
        router.replace('/login');
        router.refresh();
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? `삭제에 실패했습니다: ${err.message}`
            : '삭제에 실패했습니다.',
        );
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-delete-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isPending) onRequestClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-400"
              aria-hidden
            />
            <h2
              id="account-delete-title"
              className="text-base font-semibold text-red-600 dark:text-red-400"
            >
              정말 계정을 삭제하시겠어요?
            </h2>
          </div>
          <button
            type="button"
            onClick={() => !isPending && onRequestClose()}
            disabled={isPending}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:hover:bg-zinc-800"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
          <p>
            계정을 삭제하면 아래 데이터가 <strong>영구히 삭제</strong>되며{' '}
            <strong>복구할 수 없습니다.</strong>
          </p>
          <ul className="ml-4 list-disc space-y-0.5 text-xs text-zinc-600 dark:text-zinc-400">
            <li>채용 리스트 · 회사 유형</li>
            <li>루틴 체크 · 시간블록 · 회고</li>
            <li>운동 기록 · 세션 · 종목</li>
            <li>블로그 소스 · 수집된 글</li>
            <li>닉네임 · 프로필</li>
          </ul>

          <label className="mt-1 flex cursor-pointer items-start gap-2 text-xs">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              disabled={isPending}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-zinc-300 accent-red-600 dark:border-zinc-600"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              위 내용을 모두 확인했으며, 계정 삭제에 동의합니다.
            </span>
          </label>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="account-delete-confirm"
              className="text-xs text-zinc-500 dark:text-zinc-400"
            >
              정말 삭제하려면 아래에{' '}
              <span className="font-semibold text-red-600 dark:text-red-400">
                {CONFIRM_WORD}
              </span>
              라고 입력하세요.
            </label>
            <input
              id="account-delete-confirm"
              ref={typedRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={isPending}
              autoComplete="off"
              className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-red-500 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          {error ? (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onRequestClose}
              disabled={isPending}
              className="inline-flex min-h-11 items-center rounded px-3 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 md:min-h-0 md:py-1.5 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              취소
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={!canConfirm}
              className="inline-flex min-h-11 items-center gap-1 rounded bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:py-1.5"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {isPending ? '삭제 중…' : '영구 삭제'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
