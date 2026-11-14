'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import {
  AUTH_CARD,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_PRIMARY,
  AuthError,
  AuthFooterLink,
  AuthShell,
  BusyLabel,
} from '@/components/auth/AuthShell';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <div className="fixed inset-0 z-40 bg-paper" />
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
    <AuthShell
      title="취준 루틴 · 커리어 트래커"
      footer={
        <>
          계정이 없다면 <AuthFooterLink href="/signup">회원가입</AuthFooterLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className={AUTH_CARD}>
        <AuthError message={displayError} />

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={AUTH_LABEL}>
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
            className={AUTH_INPUT}
          />
        </div>

        {/* "잊었나요?"는 라벨 줄 오른쪽에 보이지만 DOM은 입력칸 뒤 — Tab이 비밀번호 → 잊었나요 → 로그인 순서 */}
        <div className="grid grid-cols-[1fr_auto] items-center gap-x-2 gap-y-2">
          <label htmlFor="password" className={`${AUTH_LABEL} col-start-1 row-start-1`}>
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
            className={`${AUTH_INPUT} col-span-2 row-start-2`}
          />
          <Link
            href="/forgot-password"
            className="col-start-2 row-start-1 rounded-sm text-[13px] text-btn-fg underline-offset-4 outline-none hover:underline focus-visible:shadow-[0_0_0_2px_var(--rally-chip-on-border)]"
          >
            비밀번호를 잊었나요?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting || !email || !password}
          data-busy={submitting}
          className={AUTH_PRIMARY}
        >
          <BusyLabel busy={submitting} idle="로그인" busyText="로그인 중…" />
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
      </form>
    </AuthShell>
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
