'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { LogIn, AlertCircle } from 'lucide-react';

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
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/jobs';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? '로그인에 실패했습니다.');
        setSubmitting(false);
        return;
      }
      // Full navigation so the cookie is picked up by proxy.ts on next request.
      window.location.href = nextPath;
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
                htmlFor="username"
                className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                아이디
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
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
                className="block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
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

            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {submitting ? '로그인 중…' : '로그인'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
          개인 전용 · 초대받은 사용자만 이용 가능합니다.
        </p>
      </div>
    </div>
  );
}
