'use client';

import { useState, type SubmitEvent } from 'react';
import { Mail } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  AUTH_CARD,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_PRIMARY,
  AuthError,
  AuthFooterLink,
  AuthNotice,
  AuthShell,
  BusyLabel,
} from '@/components/auth/AuthShell';

// 비번 재설정 flow의 진입점. 이메일 입력 → resetPasswordForEmail로 복구
// 메일 발송 → 사용자가 메일 링크 클릭 → Supabase가 recovery 세션을 심고
// /auth/reset-password로 리다이렉트. 그 페이지에서 새 비번 저장.
//
// 유효/미가입 이메일을 구분해 응답하면 계정 존재 여부가 유출되므로, 성공/
// 실패 무관하게 동일한 안내 화면을 보여줌 (Supabase도 서버 응답에서 이
// 정보를 감춤 — 실패해도 200이 옴).

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = new URL('/auth/reset-password', window.location.origin).toString();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) {
        setError(translateAuthError(resetError.message));
        setSubmitting(false);
        return;
      }
      setSent(true);
    } catch {
      setError('연결이 잠깐 끊겼어요. 잠시 후 다시 해보세요.');
      setSubmitting(false);
    }
  }

  // 보낸 뒤 — 폼 대신 안내 카드. 지금 할 일은 메일함 확인이라 [로그인으로 돌아가기]는 테두리
  if (sent) {
    return (
      <AuthShell title="비밀번호 재설정">
        <AuthNotice
          icon={Mail}
          title="재설정 링크를 보냈어요"
          action={{ href: '/login', label: '로그인으로 돌아가기', tone: 'secondary' }}
        >
          <p>
            <strong className="font-bold text-ink-strong">{email}</strong>로 보냈어요.
            <br />
            메일함을 확인해주세요.
          </p>
          <p>링크가 안 보이면 스팸함도 살펴봐 주세요.</p>
          <p>링크는 1시간 동안 유효해요.</p>
        </AuthNotice>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="비밀번호 재설정"
      footer={<AuthFooterLink href="/login">로그인으로 돌아가기</AuthFooterLink>}
    >
      <form onSubmit={handleSubmit} className={AUTH_CARD}>
        <AuthError message={error} />
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className={AUTH_LABEL}>
            가입한 이메일
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            aria-describedby="email-hint"
            className={AUTH_INPUT}
          />
          <p id="email-hint" className="text-[13px] text-ink-muted">
            입력한 주소로 재설정 링크를 보내드려요.
          </p>
        </div>
        <button type="submit" disabled={submitting || !email} data-busy={submitting} className={AUTH_PRIMARY}>
          <BusyLabel busy={submitting} idle="재설정 링크 보내기" busyText="보내는 중…" />
        </button>
      </form>
    </AuthShell>
  );
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('for security purposes') && m.includes('wait')) {
    return '너무 자주 시도했어요. 잠시 후 다시 해보세요.';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return '이메일 형식을 확인해주세요.';
  }
  // 모르는 오류도 원문(영문) 대신 한글 한 줄
  return '재설정 링크를 보내지 못했어요. 잠시 후 다시 해보세요.';
}
