'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, Mail, Send } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

  async function handleSubmit(e: FormEvent) {
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
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">비밀번호 재설정</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {sent ? (
            <div className="flex flex-col gap-3 text-sm text-zinc-700 dark:text-zinc-300">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                <p>
                  <strong>{email}</strong>로 재설정 링크를 보냈어요.
                  <br />
                  메일함을 확인해주세요. 링크가 안 보이면 스팸함도 살펴봐 주세요.
                </p>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                링크는 1시간 동안 유효해요.
              </p>
              <div className="mt-2 flex justify-end">
                <Link
                  href="/login"
                  className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 md:min-h-0 md:py-1.5 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  로그인으로 돌아가기
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
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
                  className="block min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
                />
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  입력한 주소로 재설정 링크를 보내드려요.
                </p>
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
                disabled={submitting || !email}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Send className="h-4 w-4" aria-hidden />
                {submitting ? '보내는 중…' : '재설정 링크 보내기'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('for security purposes') && m.includes('wait')) {
    return '너무 자주 시도했어요. 잠시 후 다시 해주세요.';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return '이메일 형식이 올바르지 않아요.';
  }
  return message;
}
