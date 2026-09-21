'use client';

import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react';
import { AlertCircle, KeyRound, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// 이메일 유저용 비번 변경. Google OAuth 유저는 password가 없어 이 flow 자체가
// 무의미하지만 updateUser가 그대로 통과시켜 Google 계정에도 비번을 심게 됨 →
// UX 혼란만 있고 보안 문제는 없어서 그대로 노출. (완전 차단하려면 identities
// 조회로 필터해야 하는데 복잡도 대비 가치 낮음.)

const MIN_PASSWORD_LENGTH = 8;

export function PasswordChangeRow() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 border-b border-zinc-100 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <KeyRound className="h-4 w-4 text-zinc-500" aria-hidden />
        <div className="flex-1">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            비밀번호 변경
          </div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            로그인 비밀번호를 바꿔요.
          </p>
        </div>
      </button>

      {open ? <PasswordChangeModal onRequestClose={() => setOpen(false)} /> : null}
    </>
  );
}

function PasswordChangeModal({ onRequestClose }: { onRequestClose: () => void }) {
  const [next, setNext] = useState('');
  const [nextConfirm, setNextConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    queueMicrotask(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onRequestClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isPending, onRequestClose]);

  const matches = next.length > 0 && next === nextConfirm;
  const canSubmit = next.length >= MIN_PASSWORD_LENGTH && matches && !isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        setError(translateAuthError(updateError.message));
        return;
      }
      setDone(true);
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="password-change-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isPending) onRequestClose();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden />
            <h2
              id="password-change-title"
              className="text-base font-semibold text-zinc-800 dark:text-zinc-200"
            >
              비밀번호 변경
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

        {done ? (
          <div className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>비밀번호가 바뀌었어요. 다음 로그인부터 새 비밀번호를 사용해주세요.</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onRequestClose}
                className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 md:min-h-0 md:py-1.5 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              새 비밀번호 (8자 이상)
              <input
                ref={inputRef}
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                disabled={isPending}
                className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-60 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              새 비밀번호 확인
              <input
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={nextConfirm}
                onChange={(e) => setNextConfirm(e.target.value)}
                disabled={isPending}
                className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 disabled:opacity-60 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              {nextConfirm.length > 0 && !matches ? (
                <span className="text-xs text-red-600 dark:text-red-400">비밀번호가 일치하지 않아요.</span>
              ) : null}
            </label>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onRequestClose}
                disabled={isPending}
                className="inline-flex min-h-11 items-center rounded px-3 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 md:min-h-0 md:py-1.5 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-0 md:py-1.5 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {isPending ? '변경 중…' : '변경'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// updateUser 실패 케이스별 한국어. 매칭 안 되면 원문 그대로.
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('new password should be different')) {
    return '지금 쓰던 비밀번호와 달라야 해요.';
  }
  if (m.includes('password should be at least')) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 해요.`;
  }
  if (m.includes('pwned') || m.includes('leaked') || m.includes('compromised')) {
    return '유출된 것으로 알려진 비밀번호예요. 다른 비밀번호를 써주세요.';
  }
  // Supabase "Secure password change": 최근 24h 내 로그인 없이 비번 바꾸려 할 때.
  if (m.includes('reauthentication') || m.includes('recently logged in')) {
    return '보안을 위해 최근 로그인이 필요해요. 로그아웃 후 다시 로그인하고 시도해주세요.';
  }
  if (m.includes('for security purposes') && m.includes('wait')) {
    return '너무 자주 시도했어요. 잠시 후 다시 해주세요.';
  }
  return message;
}
