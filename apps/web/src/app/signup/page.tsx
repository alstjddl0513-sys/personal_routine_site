'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Dices, UserPlus, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { checkNicknameAvailability, HttpError, upsertMyProfile } from '@/lib/api';
import { randomNickname } from '@/lib/nickname';

type NicknameStatus =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'error'; message: string };

const NICKNAME_REGEX = /^[\p{L}\p{N}_]+$/u;

function validateNicknameShape(value: string): NicknameStatus | null {
  if (value.length < 2) return { kind: 'invalid', message: '닉네임은 2자 이상이어야 합니다.' };
  if (value.length > 20) return { kind: 'invalid', message: '닉네임은 20자 이내여야 합니다.' };
  if (!NICKNAME_REGEX.test(value)) {
    return { kind: 'invalid', message: '한글·영문·숫자·언더바만 사용할 수 있어요.' };
  }
  return null;
}

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameStatus, setNicknameStatus] = useState<NicknameStatus>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Debounced availability check. Skip when the shape is invalid — the
  // client-side error is already shown and the server would just 400.
  useEffect(() => {
    if (!nickname) {
      setNicknameStatus({ kind: 'idle' });
      return;
    }
    const shapeErr = validateNicknameShape(nickname);
    if (shapeErr) {
      setNicknameStatus(shapeErr);
      return;
    }
    setNicknameStatus({ kind: 'checking' });
    const t = setTimeout(async () => {
      try {
        const { available } = await checkNicknameAvailability(nickname);
        setNicknameStatus({ kind: available ? 'available' : 'taken' });
      } catch (err) {
        setNicknameStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : '확인 실패',
        });
      }
    }, 400);
    return () => clearTimeout(t);
  }, [nickname]);

  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const canSubmit =
    !!email &&
    nicknameStatus.kind === 'available' &&
    password.length >= 6 &&
    passwordsMatch &&
    !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        setError(translateAuthError(signUpError.message));
        setSubmitting(false);
        return;
      }
      // Console에서 Confirm email이 꺼져있으면 signUp이 세션까지 세팅해줌.
      // 켜져있으면 세션 없어서 profile 저장 못 함 → 안내로 유도.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setError(
          '가입은 됐지만 이메일 확인이 필요해요. Console에서 Confirm email을 끄거나, 받은 메일의 링크를 눌러주세요.',
        );
        setSubmitting(false);
        return;
      }
      try {
        await upsertMyProfile(nickname);
      } catch (err) {
        if (err instanceof HttpError && err.status === 409) {
          setError('닉네임이 방금 다른 사람에게 선점됐어요. 다른 닉네임으로 다시 시도해주세요.');
        } else {
          setError('프로필 저장 실패. 잠시 후 다시 시도해주세요.');
        }
        // 세션은 살아있음 — 사용자가 닉네임만 바꿔 재시도 가능.
        setSubmitting(false);
        return;
      }
      router.replace('/jobs');
      router.refresh();
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
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">회원가입</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="space-y-4">
            <Field htmlFor="email" label="이메일">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                className={inputCls}
              />
            </Field>

            <Field
              htmlFor="nickname"
              label="닉네임"
              hint="2~20자, 한글/영문/숫자/언더바"
            >
              <div className="relative">
                <input
                  id="nickname"
                  type="text"
                  autoComplete="off"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  disabled={submitting}
                  className={`${inputCls} pr-20`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
                  <NicknameStatusIcon status={nicknameStatus} />
                  <button
                    type="button"
                    onClick={() => setNickname(randomNickname())}
                    disabled={submitting}
                    aria-label="랜덤 닉네임 생성"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <Dices className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </div>
              <NicknameStatusMessage status={nicknameStatus} />
            </Field>

            <Field htmlFor="password" label="비밀번호" hint="6자 이상">
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className={inputCls}
              />
            </Field>

            <Field htmlFor="passwordConfirm" label="비밀번호 확인">
              <input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                disabled={submitting}
                className={inputCls}
              />
              {passwordConfirm.length > 0 && password !== passwordConfirm ? (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  비밀번호가 일치하지 않습니다.
                </p>
              ) : null}
            </Field>

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
              <UserPlus className="h-4 w-4" aria-hidden />
              {submitting ? '가입 중…' : '회원가입'}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
          이미 계정이 있다면{' '}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

const inputCls =
  'block min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-800';

function Field({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400"
      >
        {label} {hint ? <span className="text-zinc-400">({hint})</span> : null}
      </label>
      {children}
    </div>
  );
}

function NicknameStatusIcon({ status }: { status: NicknameStatus }) {
  if (status.kind === 'checking') {
    return (
      <span
        className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent"
        aria-hidden
      />
    );
  }
  if (status.kind === 'available') {
    return <Check className="h-4 w-4 text-emerald-500" aria-label="사용 가능" />;
  }
  if (status.kind === 'taken' || status.kind === 'invalid') {
    return <X className="h-4 w-4 text-red-500" aria-label="사용 불가" />;
  }
  return null;
}

function NicknameStatusMessage({ status }: { status: NicknameStatus }) {
  if (status.kind === 'invalid') {
    return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{status.message}</p>;
  }
  if (status.kind === 'taken') {
    return (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">이미 사용 중인 닉네임입니다.</p>
    );
  }
  if (status.kind === 'available') {
    return (
      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">사용할 수 있어요.</p>
    );
  }
  if (status.kind === 'error') {
    return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{status.message}</p>;
  }
  return null;
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return '이미 가입된 이메일입니다. 로그인해주세요.';
  }
  if (m.includes('password should be at least')) {
    return '비밀번호는 6자 이상이어야 합니다.';
  }
  // Supabase "Prevent leaked passwords" (HIBP) 정책이 켜져있을 때 반환.
  if (m.includes('pwned') || m.includes('leaked') || m.includes('compromised')) {
    return '유출된 것으로 알려진 비밀번호입니다. 다른 비밀번호를 사용해주세요.';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return '이메일 형식이 올바르지 않습니다.';
  }
  return message;
}
