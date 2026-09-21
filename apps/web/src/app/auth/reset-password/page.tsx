'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, KeyRound } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// 복구 메일 링크의 목적지. Supabase는 링크 클릭 시 recovery 세션을 브라우저
// 쿠키에 자동으로 심어주므로 여기서는 그 세션 위에서 updateUser({password})만
// 부르면 됨. 세션이 없거나 만료된 상태에서 이 URL을 직접 열면 updateUser가
// "Auth session missing"으로 실패 — 그때는 /forgot-password로 다시 유도.
//
// PKCE flow: URL fragment(#access_token=...) 또는 ?code= 로 오는데, supabase-js가
// 자동으로 세션 교환을 처리해줌. onAuthStateChange의 PASSWORD_RECOVERY 이벤트로
// 감지해 폼을 활성화.

const MIN_PASSWORD_LENGTH = 8;

type Phase = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('checking');
  const [next, setNext] = useState('');
  const [nextConfirm, setNextConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    // Recovery 링크로 진입하면 supabase-js가 URL의 fragment/code를 소비해
    // 세션을 세팅. 이미 세팅됐는지(리로드 등)와 새로 들어오는 이벤트 둘 다 커버.
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) setPhase('ready');
    }
    check();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (session && phase === 'checking')) {
        setPhase('ready');
      }
    });

    // 5초 안에 recovery 세션이 안 잡히면 링크 만료/잘못된 진입으로 간주.
    const timeout = setTimeout(() => {
      if (cancelled) return;
      setPhase((p) => (p === 'checking' ? 'invalid' : p));
    }, 5000);

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === 'ready') queueMicrotask(() => inputRef.current?.focus());
  }, [phase]);

  const matches = next.length > 0 && next === nextConfirm;
  const canSubmit = next.length >= MIN_PASSWORD_LENGTH && matches && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        setError(translateAuthError(updateError.message));
        setSubmitting(false);
        return;
      }
      setPhase('done');
      // 새 비번으로 세션이 유지되므로 잠시 안내 후 /jobs로 이동.
      setTimeout(() => {
        router.replace('/jobs');
        router.refresh();
      }, 1500);
    } catch {
      setError('네트워크 오류가 발생했어요. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <Image src="/icon.svg" alt="" aria-hidden width={36} height={36} className="h-9 w-9" priority />
            Rally
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">새 비밀번호 설정</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {phase === 'checking' ? (
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
              링크를 확인하고 있어요…
            </p>
          ) : phase === 'invalid' ? (
            <div className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden />
                <p>
                  링크가 만료됐거나 유효하지 않아요.
                  <br />
                  다시 재설정 메일을 받아주세요.
                </p>
              </div>
              <div className="mt-2 flex justify-end">
                <Link
                  href="/forgot-password"
                  className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 md:min-h-0 md:py-1.5 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  다시 요청하기
                </Link>
              </div>
            </div>
          ) : phase === 'done' ? (
            <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
              비밀번호가 바뀌었어요. 잠시 후 이동해요…
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                  disabled={submitting}
                  className="block min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
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
                  disabled={submitting}
                  className="block min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
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

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                {submitting ? '변경 중…' : '비밀번호 변경'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

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
  if (m.includes('auth session missing') || m.includes('invalid') && m.includes('token')) {
    return '링크가 만료됐거나 유효하지 않아요. 재설정 메일을 다시 받아주세요.';
  }
  return message;
}
