'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Dices, Loader2, Mail, X } from 'lucide-react';
import { GoogleButton, OrDivider } from '@/components/auth/GoogleButton';
import {
  AUTH_CARD,
  AUTH_INPUT,
  AUTH_INPUT_ERROR,
  AUTH_LABEL,
  AUTH_PRIMARY,
  AuthError,
  AuthFooterLink,
  AuthNotice,
  AuthShell,
  BusyLabel,
} from '@/components/auth/AuthShell';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { checkNicknameAvailability, HttpError, upsertMyProfile } from '@/lib/api';
import { randomNickname } from '@/lib/nickname';

// [Google로 계속하기]는 로그인 화면과 같은 GoogleButton — OAuth 콜백에서 신규 유저면 프로필 자동 생성.
// 가입 화면에도 둬서 Google로 가입하려는 사람이 로그인 화면을 찾지 않아도 되게.

type NicknameStatus =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'error'; message: string };

const NICKNAME_REGEX = /^[\p{L}\p{N}_]+$/u;

function validateNicknameShape(value: string): NicknameStatus | null {
  if (value.length < 2) return { kind: 'invalid', message: '닉네임은 2자 이상으로 적어주세요.' };
  if (value.length > 20) return { kind: 'invalid', message: '닉네임은 20자 이내로 적어주세요.' };
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
  // 가입 확인 메일을 보낸 주소 — 있으면 폼 대신 "메일을 보냈어요" 안내(전엔 빨간 오류 상자로 떴음)
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // Debounced availability check driven by input event, not an effect
  // (react-hooks/set-state-in-effect used to flag the sync 'idle' reset).
  function updateNickname(next: string) {
    setNickname(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!next) {
      setNicknameStatus({ kind: 'idle' });
      return;
    }
    const shapeErr = validateNicknameShape(next);
    if (shapeErr) {
      setNicknameStatus(shapeErr);
      return;
    }
    setNicknameStatus({ kind: 'checking' });
    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkNicknameAvailability(next);
        setNicknameStatus({ kind: available ? 'available' : 'taken' });
      } catch {
        // 서버 오류 원문 대신 한 줄
        setNicknameStatus({ kind: 'error', message: '닉네임을 확인하지 못했어요. 잠시 후 다시 해보세요.' });
      }
    }, 400);
  }

  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const canSubmit =
    !!email &&
    nicknameStatus.kind === 'available' &&
    password.length >= 8 &&
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
        setSentTo(email);
        setSubmitting(false);
        return;
      }
      try {
        await upsertMyProfile(nickname);
      } catch (err) {
        if (err instanceof HttpError && err.status === 409) {
          setError('이미 사용 중인 닉네임이에요. 다른 닉네임으로 다시 해보세요.');
        } else {
          setError('프로필을 저장하지 못했어요. 잠시 후 다시 해보세요.');
        }
        // 세션은 살아있음 — 사용자가 닉네임만 바꿔 재시도 가능.
        setSubmitting(false);
        return;
      }
      router.replace('/today');
      router.refresh();
    } catch {
      setError('연결이 잠깐 끊겼어요. 잠시 후 다시 해보세요.');
      setSubmitting(false);
    }
  }

  const footer = (
    <>
      이미 계정이 있다면 <AuthFooterLink href="/login">로그인</AuthFooterLink>
    </>
  );

  // 확인 메일을 보냈으면 폼 대신 안내 카드 — 강조는 메일 주소 한 군데
  if (sentTo) {
    return (
      <AuthShell title="회원가입">
        <AuthNotice
          icon={Mail}
          title="가입 확인 메일을 보냈어요"
          action={{ href: '/login', label: '로그인으로 돌아가기', tone: 'secondary' }}
        >
          <p>
            <strong className="font-bold text-ink-strong">{sentTo}</strong>로 보냈어요.
            <br />
            메일의 링크를 눌러 가입을 마쳐주세요.
          </p>
          <p>링크가 안 보이면 스팸함도 살펴봐 주세요.</p>
        </AuthNotice>
      </AuthShell>
    );
  }

  const nicknameBad = nicknameStatus.kind === 'taken' || nicknameStatus.kind === 'invalid' || nicknameStatus.kind === 'error';
  const confirmBad = passwordConfirm.length > 0 && password !== passwordConfirm;

  return (
    <AuthShell title="회원가입" footer={footer}>
      <form onSubmit={handleSubmit} className={AUTH_CARD}>
        <AuthError message={error} />

        <Field htmlFor="email" label="이메일">
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
        </Field>

        <Field htmlFor="nickname" label="닉네임">
          {/* 칸 안 오른쪽에 상태 아이콘(✓ · ✕ · 회전) + 🎲 40px. 아이콘만으로 판단하지 않게 칸 아래 글자 한 줄 */}
          <div className="relative">
            <input
              id="nickname"
              type="text"
              autoComplete="off"
              required
              placeholder="2~20자, 한글/영문/숫자/언더바"
              value={nickname}
              onChange={(e) => updateNickname(e.target.value)}
              disabled={submitting}
              aria-invalid={nicknameBad}
              aria-describedby="nickname-status"
              className={`${AUTH_INPUT} pr-21 ${nicknameBad ? AUTH_INPUT_ERROR : ''}`}
            />
            <div className="absolute inset-y-0 right-0.5 flex items-center gap-0.5">
              <NicknameStatusIcon status={nicknameStatus} />
              <button
                type="button"
                onClick={() => updateNickname(randomNickname())}
                disabled={submitting}
                aria-label="랜덤 닉네임"
                title="랜덤 닉네임"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-ink-muted outline-none hover:bg-row-hover hover:text-ink focus-visible:shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)] disabled:opacity-40"
              >
                <Dices className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <NicknameStatusMessage status={nicknameStatus} />
        </Field>

        <Field htmlFor="password" label="비밀번호" hint="8자 이상">
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className={AUTH_INPUT}
          />
        </Field>

        <Field htmlFor="passwordConfirm" label="비밀번호 확인">
          <input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            disabled={submitting}
            aria-invalid={confirmBad}
            className={`${AUTH_INPUT} ${confirmBad ? AUTH_INPUT_ERROR : ''}`}
          />
          {confirmBad ? <p className="text-[13px] text-alert">비밀번호가 일치하지 않아요.</p> : null}
        </Field>

        <button type="submit" disabled={!canSubmit} data-busy={submitting} className={AUTH_PRIMARY}>
          <BusyLabel busy={submitting} idle="회원가입" busyText="가입 중…" />
        </button>

        <OrDivider />

        <GoogleButton
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
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className={AUTH_LABEL}>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-muted">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

function NicknameStatusIcon({ status }: { status: NicknameStatus }) {
  if (status.kind === 'checking') {
    return <Loader2 className="h-4 w-4 animate-spin text-ink-faint" aria-hidden />;
  }
  if (status.kind === 'available') {
    return <Check className="h-4 w-4 text-primary" aria-label="사용 가능" />;
  }
  if (status.kind === 'taken' || status.kind === 'invalid') {
    return <X className="h-4 w-4 text-alert" aria-label="사용 불가" />;
  }
  return null;
}

// 칸 아래 13px 한 줄 — 확인 중(ink-faint) · 사용할 수 있어요(primary + ✓) · 사용 중 · 형식 · 오류(alert)
function NicknameStatusMessage({ status }: { status: NicknameStatus }) {
  const base = 'flex items-center gap-1 text-[13px]';
  let content: ReactNode = null;
  if (status.kind === 'checking') {
    content = <span className={`${base} text-ink-faint`}>확인 중…</span>;
  } else if (status.kind === 'available') {
    content = (
      <span className={`${base} text-primary`}>
        <Check className="h-3.5 w-3.5" aria-hidden />
        사용할 수 있어요.
      </span>
    );
  } else if (status.kind === 'taken') {
    content = <span className={`${base} text-alert`}>이미 사용 중인 닉네임이에요.</span>;
  } else if (status.kind === 'invalid' || status.kind === 'error') {
    content = <span className={`${base} text-alert`}>{status.message}</span>;
  }
  return (
    <p id="nickname-status" role="status" className="min-h-0 empty:hidden">
      {content}
    </p>
  );
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return '이미 가입된 이메일이에요. 로그인해주세요.';
  }
  if (m.includes('password should be at least')) {
    return '비밀번호는 8자 이상이어야 해요.';
  }
  // Supabase "Prevent leaked passwords" (HIBP) 정책이 켜져있을 때 반환.
  if (m.includes('pwned') || m.includes('leaked') || m.includes('compromised')) {
    return '유출된 것으로 알려진 비밀번호예요. 다른 비밀번호를 써주세요.';
  }
  if (m.includes('invalid email') || m.includes('unable to validate email')) {
    return '이메일 형식을 확인해주세요.';
  }
  // 모르는 오류도 원문(영문) 대신 한글 한 줄
  return '가입하지 못했어요. 잠시 후 다시 해보세요.';
}
