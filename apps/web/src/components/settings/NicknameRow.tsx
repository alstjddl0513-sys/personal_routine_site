'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Dices, User, X } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  HttpError,
  checkNicknameAvailability,
  getMyProfile,
  renameMyNickname,
} from '@/lib/api';
import { randomNickname } from '@/lib/nickname';

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

export function NicknameRow() {
  const [current, setCurrent] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch initial nickname. Re-fetch on auth change (unlikely on this
  // page but keeps state honest).
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
        // Auth-off dev mode or transient error — leave state empty.
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

  // Debounced availability check driven by the input event, not an effect
  // (react-hooks/set-state-in-effect used to flag the sync 'idle' reset).
  function updateDraft(next: string) {
    setDraft(next);
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
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : '확인 실패',
        });
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
    } catch (err) {
      if (err instanceof HttpError && err.status === 409) {
        setError('닉네임이 방금 다른 사람에게 선점됐어요. 다른 닉네임으로 시도해주세요.');
        setStatus({ kind: 'taken' });
      } else {
        setError('저장 실패. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setSaving(false);
    }
  }

  const canSave = status.kind === 'available' && !saving;

  if (current === null) {
    // Auth-off dev mode or profile not yet created — hide the row.
    return null;
  }

  return (
    <div className="flex flex-col gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        <User className="h-4 w-4 text-zinc-500" aria-hidden />
        <div className="flex-1">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">닉네임</div>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            사이드바와 공유 화면에 표시돼요.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1 pl-7">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={draft}
              onChange={(e) => updateDraft(e.target.value)}
              disabled={saving}
              className="block min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 pr-20 text-base text-zinc-900 outline-none transition-colors focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-500 dark:focus:ring-zinc-800"
            />
            <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
              <StatusIcon status={status} />
              <button
                type="button"
                onClick={() => updateDraft(randomNickname())}
                disabled={saving}
                aria-label="랜덤 닉네임 생성"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              >
                <Dices className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 md:min-h-0 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
        <StatusMessage status={status} draftSameAsCurrent={draft === current} />
        {error ? (
          <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
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

function StatusMessage({
  status,
  draftSameAsCurrent,
}: {
  status: Status;
  draftSameAsCurrent: boolean;
}) {
  if (draftSameAsCurrent) return null;
  if (status.kind === 'invalid') {
    return <p className="text-xs text-red-600 dark:text-red-400">{status.message}</p>;
  }
  if (status.kind === 'taken') {
    return <p className="text-xs text-red-600 dark:text-red-400">이미 사용중인 닉네임이에요.</p>;
  }
  if (status.kind === 'available') {
    return <p className="text-xs text-emerald-600 dark:text-emerald-400">사용가능한 닉네임이에요.</p>;
  }
  if (status.kind === 'error') {
    return <p className="text-xs text-red-600 dark:text-red-400">{status.message}</p>;
  }
  return null;
}
