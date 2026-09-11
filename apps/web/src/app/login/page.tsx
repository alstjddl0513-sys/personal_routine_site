'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />
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
      : '/jobs';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // OAuth 콜백에서 실패해서 되돌아오는 경우 배너로 표시.
  useEffect(() => {
    if (searchParams.get('error') === 'oauth') {
      setError('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
    }
  }, [searchParams]);

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
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // nextPath는 origin/auth/callback으로 넘겨 콜백 라우트에서 다시 활용.
      const callback = new URL('/auth/callback', window.location.origin);
      if (nextPath !== '/jobs') callback.searchParams.set('next', nextPath);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: callback.toString() },
      });
      if (oauthError) {
        setError('Google 로그인 시작에 실패했습니다.');
        setSubmitting(false);
      }
      // 성공 시 브라우저가 Google로 redirect됨.
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
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
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                비밀번호
              </label>
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

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}

            <Divider>또는</Divider>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <GoogleIcon />
              Google로 시작하기
            </button>

            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {submitting ? '로그인 중…' : '로그인'}
            </button>
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

function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      {children}
      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

// Google 공식 4색 "G" 로고. lucide-react엔 없어 인라인 SVG.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

// Supabase의 영문 auth 에러를 한국어로. 매칭 안 되면 원문 그대로.
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (m.includes('email not confirmed')) {
    return '이메일 확인이 필요합니다. Console에서 Confirm email을 꺼두세요.';
  }
  return message;
}
