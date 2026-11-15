'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Dices, LoaderCircle, User } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { HttpError, checkNicknameAvailability, getMyProfile, renameMyNickname } from '@/lib/api';
import { randomNickname } from '@/lib/nickname';
import { SettingsRow } from './SettingsRow';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';

type Status =
  | { kind: 'idle' }
  | { kind: 'invalid'; message: string }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'taken' }
  | { kind: 'error'; message: string };

const NICKNAME_REGEX = /^[\p{L}\p{N}_]+$/u;

function shapeError(value: string): Status | null {
  if (value.length < 2) return { kind: 'invalid', message: '2자 이상' };
  if (value.length > 20) return { kind: 'invalid', message: '20자 이내' };
  if (!NICKNAME_REGEX.test(value)) {
    return { kind: 'invalid', message: '한글·영문·숫자·언더바만' };
  }
  return null;
}

// 비활성 테두리 버튼 — 고치지 않았거나 확인 중·오류일 때 [저장]
const DISABLED_BTN =
  'inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-divider bg-surface px-4 text-sm text-icon-faint';
const FIELD =
  'block min-h-10 w-full min-w-0 rounded-md border bg-surface px-3 text-[15px] text-ink outline-none placeholder:text-ink-faint disabled:opacity-60';

// 닉네임 — 그 자리에서 고침. 입력하고 0.4초 뒤 확인, 사용 가능할 때만 [저장]이 채운 버튼
export function NicknameRow() {
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 처음 닉네임 읽기 — 로그인 상태가 바뀌면 다시(이 화면에선 드물지만 상태를 맞춰둠)
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    async function refresh() {
      try {
        const profile = await getMyProfile();
        if (cancelled) return;
        if (profile) {
          setCurrent(profile.nickname);
          setDraft(profile.nickname);
        }
      } catch {
        // 인증 끈 개발 모드 · 잠깐 오류 — 비워 둠
      }
    }
    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => refresh());
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  // 확인은 입력 이벤트에서(effect 안 setState 금지 규칙)
  function updateDraft(next: string) {
    setDraft(next);
    setSaved(false);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!next || next === current) {
      setStatus({ kind: 'idle' });
      return;
    }
    const shapeErr = shapeError(next);
    if (shapeErr) {
      setStatus(shapeErr);
      return;
    }
    setStatus({ kind: 'checking' });
    debounceRef.current = setTimeout(async () => {
      try {
        const { available } = await checkNicknameAvailability(next);
        setStatus({ kind: available ? 'available' : 'taken' });
      } catch (err) {
        console.error(err);
        setStatus({ kind: 'error', message: '닉네임을 확인하지 못했어요. 잠시 후 다시 해보세요.' });
      }
    }, 400);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await renameMyNickname(draft);
      setCurrent(updated.nickname);
      setStatus({ kind: 'idle' });
      setSaved(true);
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError('닉네임이 방금 다른 사람에게 선점됐어요. 다른 닉네임으로 다시 시도해주세요.');
        setStatus({ kind: 'taken' });
      } else {
        console.error(err);
        setError('저장하지 못했어요. 잠시 후 다시 해보세요.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (current === null) return null; // 인증 끈 개발 모드 · 프로필 아직 없음

  const canSave = status.kind === 'available' && !saving;
  const bad = status.kind === 'taken' || status.kind === 'invalid';

  return (
    <SettingsRow
      stackOnMobile
      icon={User}
      title="닉네임"
      desc="사이드바와 공유 화면에 표시돼요."
      end={
        <span className="flex w-full flex-col gap-1.5 md:w-85">
          <span className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => updateDraft(e.target.value)}
              disabled={saving}
              aria-label="닉네임"
              aria-invalid={bad}
              className={`${FIELD} flex-1 ${bad ? 'border-alert' : 'border-btn-border focus:border-chip-on-border'}`}
            />
            <button
              type="button"
              onClick={() => updateDraft(randomNickname())}
              disabled={saving}
              aria-label="랜덤 닉네임"
              title="랜덤 닉네임"
              className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-btn-border bg-btn-bg text-ink-soft hover:border-heading disabled:opacity-50"
            >
              <Dices className="h-4.5 w-4.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={canSave || saving ? `${BUTTON_PRIMARY} shrink-0` : DISABLED_BTN}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </span>
          <StatusLine status={status} saved={saved} sameAsCurrent={draft === current} error={error} />
        </span>
      }
    />
  );
}

function StatusLine({
  status,
  saved,
  sameAsCurrent,
  error,
}: {
  status: Status;
  saved: boolean;
  sameAsCurrent: boolean;
  error: string | null;
}) {
  const line = 'flex items-center gap-1 text-[13px]';
  if (error)
    return (
      <span role="alert" className={`${line} text-alert`}>
        {error}
      </span>
    );
  if (saved && sameAsCurrent)
    return (
      <span role="status" className={`${line} text-ink-faint`}>
        <Check className="h-3.5 w-3.5" aria-hidden />
        저장됨
      </span>
    );
  if (sameAsCurrent) return null;
  if (status.kind === 'checking')
    return (
      <span role="status" className={`${line} text-ink-faint`}>
        <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        확인 중…
      </span>
    );
  if (status.kind === 'available')
    return (
      <span role="status" className={`${line} text-primary`}>
        <Check className="h-3.5 w-3.5" aria-hidden />
        사용할 수 있는 닉네임이에요.
      </span>
    );
  if (status.kind === 'taken') return <span className={`${line} text-alert`}>이미 사용 중인 닉네임이에요.</span>;
  if (status.kind === 'invalid' || status.kind === 'error')
    return <span className={`${line} text-alert`}>{status.message}</span>;
  return null;
}
