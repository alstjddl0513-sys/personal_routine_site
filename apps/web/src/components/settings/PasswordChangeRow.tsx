'use client';

import { useState, useTransition, type SubmitEvent } from 'react';
import { Check, KeyRound } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { SettingsRow } from './SettingsRow';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';

// 이메일 유저용 비번 변경. Google OAuth 유저는 password가 없어 이 flow 자체가
// 무의미하지만 updateUser가 그대로 통과시켜 Google 계정에도 비번을 심게 됨 →
// UX 혼란만 있고 보안 문제는 없어서 그대로 노출. (완전 차단하려면 identities
// 조회로 필터해야 하는데 복잡도 대비 가치 낮음.)
// 창(모달) 대신 계정 카드 안 그 자리에서 — 두 칸이 차고 같을 때만 [변경]이 채운 버튼.

const MIN_PASSWORD_LENGTH = 8;
const FIELD =
  'block min-h-10 w-full min-w-0 rounded-md border bg-surface px-3 text-[15px] text-ink outline-none placeholder:text-ink-faint disabled:opacity-60';
const DISABLED_BTN =
  'inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-divider bg-surface px-4 text-sm text-icon-faint';

export function PasswordChangeRow() {
  const [next, setNext] = useState('');
  const [nextConfirm, setNextConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const matches = next.length > 0 && next === nextConfirm;
  const mismatch = nextConfirm.length > 0 && !matches;
  const canSubmit = next.length >= MIN_PASSWORD_LENGTH && matches && !isPending;

  function edit(setter: (v: string) => void, v: string) {
    setter(v);
    setDone(false);
    setError(null);
  }

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: next });
      if (updateError) {
        console.error(updateError);
        setError(translateAuthError(updateError.message));
        return;
      }
      setNext('');
      setNextConfirm('');
      setDone(true);
    });
  }

  return (
    <SettingsRow
      stackOnMobile
      icon={KeyRound}
      title="비밀번호 변경"
      desc="로그인 비밀번호를 바꿔요."
      // 2열 격자 — 첫 칸도 [변경] 앞에서 끝나게(아래 확인 칸과 폭 맞춤)
      end={
        <form
          onSubmit={handleSubmit}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:w-85"
        >
          <input
            type="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            placeholder={`새 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
            aria-label="새 비밀번호"
            value={next}
            onChange={(e) => edit(setNext, e.target.value)}
            disabled={isPending}
            className={`${FIELD} border-btn-border focus:border-chip-on-border`}
          />
          <span aria-hidden />
            <input
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              placeholder="새 비밀번호 확인"
              aria-label="새 비밀번호 확인"
              aria-invalid={mismatch}
              value={nextConfirm}
              onChange={(e) => edit(setNextConfirm, e.target.value)}
              disabled={isPending}
              className={`${FIELD} ${mismatch ? 'border-alert' : 'border-btn-border focus:border-chip-on-border'}`}
            />
            <button
              type="submit"
              disabled={!canSubmit}
              className={canSubmit || isPending ? `${BUTTON_PRIMARY} shrink-0` : DISABLED_BTN}
            >
              {isPending ? '변경 중…' : '변경'}
            </button>
          {mismatch ? (
            <span className="col-span-2 text-[13px] text-alert">비밀번호가 일치하지 않아요.</span>
          ) : error ? (
            <span role="alert" className="col-span-2 text-[13px] text-alert">
              {error}
            </span>
          ) : done ? (
            <span role="status" className="col-span-2 flex items-start gap-1 text-[13px] text-primary">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              비밀번호가 바뀌었어요. 다음 로그인부터 새 비밀번호를 사용해주세요.
            </span>
          ) : null}
        </form>
      }
    />
  );
}

// updateUser 실패 케이스별 한국어. 모르는 경우도 원문 대신 안내(서버 원문 노출 X)
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
  // Supabase "Secure password change": 최근 24h 내 로그인 없이 비번 바꾸려 할 때.
  if (m.includes('reauthentication') || m.includes('recently logged in')) {
    return '보안을 위해 최근 로그인이 필요해요. 로그아웃 후 다시 로그인하고 시도해주세요.';
  }
  if (m.includes('for security purposes') && m.includes('wait')) {
    return '너무 자주 시도했어요. 잠시 후 다시 해주세요.';
  }
  return '비밀번호를 바꾸지 못했어요. 잠시 후 다시 해보세요.';
}
