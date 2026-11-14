'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CircleCheck, Loader2, Unlink } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  AUTH_CARD,
  AUTH_INPUT,
  AUTH_INPUT_ERROR,
  AUTH_LABEL,
  AUTH_PRIMARY,
  AuthError,
  AuthNotice,
  AuthShell,
  BusyLabel,
} from '@/components/auth/AuthShell';

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
      // 새 비번으로 세션이 유지되므로 잠시 안내 후 /today로 이동.
      setTimeout(() => {
        router.replace('/today');
        router.refresh();
      }, 1500);
    } catch {
      setError('연결이 잠깐 끊겼어요. 잠시 후 다시 해보세요.');
      setSubmitting(false);
    }
  }

  // 링크 만료 · 변경 완료는 안내 카드(경고색 없음 — 사용자 잘못이 아니고 할 일이 분명해서)
  if (phase === 'invalid') {
    return (
      <AuthShell title="새 비밀번호 설정">
        <AuthNotice
          icon={Unlink}
          title="링크가 만료됐어요"
          action={{ href: '/forgot-password', label: '다시 요청하기', tone: 'primary' }}
        >
          <p>
            링크가 만료됐거나 유효하지 않아요.
            <br />
            재설정 메일을 다시 받아주세요.
          </p>
        </AuthNotice>
      </AuthShell>
    );
  }
  if (phase === 'done') {
    return (
      <AuthShell title="새 비밀번호 설정">
        {/* 버튼 없이 자동 이동 */}
        <AuthNotice icon={CircleCheck} title="비밀번호가 바뀌었어요">
          <p role="status">잠시 후 이동해요…</p>
        </AuthNotice>
      </AuthShell>
    );
  }

  const mismatch = nextConfirm.length > 0 && !matches;

  return (
    <AuthShell title="새 비밀번호 설정">
      {phase === 'checking' ? (
        <div className={`${AUTH_CARD} items-center gap-3! py-11! text-[15px] text-ink-soft`} role="status">
          <Loader2 className="h-5 w-5 animate-spin text-ink-faint" aria-hidden />
          링크를 확인하고 있어요…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={AUTH_CARD}>
          <AuthError message={error} />
          <div className="flex flex-col gap-2">
            <label htmlFor="new-password" className={AUTH_LABEL}>
              새 비밀번호
              <span className="ml-1.5 font-normal text-ink-muted">{MIN_PASSWORD_LENGTH}자 이상</span>
            </label>
            <input
              id="new-password"
              ref={inputRef}
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              disabled={submitting}
              className={AUTH_INPUT}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="new-password-confirm" className={AUTH_LABEL}>
              새 비밀번호 확인
            </label>
            <input
              id="new-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={nextConfirm}
              onChange={(e) => setNextConfirm(e.target.value)}
              disabled={submitting}
              aria-invalid={mismatch}
              className={`${AUTH_INPUT} ${mismatch ? AUTH_INPUT_ERROR : ''}`}
            />
            {mismatch ? <p className="text-[13px] text-alert">비밀번호가 일치하지 않아요.</p> : null}
          </div>
          <button type="submit" disabled={!canSubmit} data-busy={submitting} className={AUTH_PRIMARY}>
            <BusyLabel busy={submitting} idle="비밀번호 변경" busyText="변경 중…" />
          </button>
        </form>
      )}
    </AuthShell>
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
  // 모르는 오류도 원문(영문) 대신 한글 한 줄
  return '비밀번호를 바꾸지 못했어요. 잠시 후 다시 해보세요.';
}
