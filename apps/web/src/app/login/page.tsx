'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-linear-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only accept same-origin internal paths — bare `/foo`, never `//host`
  // (protocol-relative) or absolute URLs — so a crafted `?next=` can't
  // hijack the post-login redirect.
  const rawNext = searchParams.get('next');
  const nextPath =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/today';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // OAuth 콜백에서 실패해서 되돌아오는 경우 URL에 ?error=oauth 로 표시.
  // render 시점 파생 — 별도 상태 없이 배너 노출. 사용자가 password 로그인을
  // 시도해 error가 세팅되면 그쪽이 우선.
  const oauthError =
    searchParams.get('error') === 'oauth'
      ? 'Google 로그인을 마치지 못했어요. 다시 해보세요.'
      : null;
  const displayError = error ?? oauthError;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(translateAuthError(signInError.message));
        setSubmitting(false);
        return;
      }
      // replace (not push) so back-nav can't return to /login.
      // refresh so Server Components re-run with the new session cookie.
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError('연결이 잠깐 끊겼어요. 잠시 후 다시 해보세요.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-linear-to-br from-zinc-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            <Image src="/icon.svg" alt="" aria-hidden width={36} height={36} className="h-9 w-9" priority />
            Rally
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            취준 루틴 · 커리어 트래커
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className="block min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  비밀번호
                </label>
                {/* 비밀번호 찾기 화면으로 가는 길이 재설정 실패 화면뿐이었음 */}
                <Link
                  href="/forgot-password"
                  className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  비밀번호를 잊었나요?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className="block min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
              />
            </div>

            {displayError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{displayError}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {submitting ? '로그인 중…' : '로그인'}
            </button>

            <OrDivider />

            <GoogleButton
              nextPath={nextPath}
              disabled={submitting}
              onStart={() => {
                setError(null);
                setSubmitting(true);
              }}
              onError={(msg) => {
                setError(msg);
                setSubmitting(false);
              }}
            />
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          계정이 없다면{' '}
          <Link
            href="/signup"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}

// Supabase의 영문 auth 에러를 한국어로. 모르는 오류도 원문(영문) 대신 한글 한 줄.
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 맞지 않아요.';
  }
  if (m.includes('email not confirmed')) {
    return '이메일 인증이 아직 안 됐어요. 받은 메일의 링크를 눌러주세요.';
  }
  return '로그인하지 못했어요. 잠시 후 다시 해보세요.';
}
