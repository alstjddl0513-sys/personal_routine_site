'use client';

import { useState, useSyncExternalStore } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

function readPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'default';
}

// requestPermission 성공 후 자기 컴포넌트가 재렌더되도록 broadcast.
// 브라우저 permission API에 표준 change 이벤트가 없어 대체.
const PERMISSION_CHANGE_EVENT = 'rally.notif.permission-changed';

function subscribePermission(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(PERMISSION_CHANGE_EVENT, cb);
  return () => window.removeEventListener(PERMISSION_CHANGE_EVENT, cb);
}

export function NotificationPermissionRow() {
  // 서버 render는 null(placeholder), hydration 후 실제 permission으로 재렌더.
  const state = useSyncExternalStore<PermissionState | null>(
    subscribePermission,
    () => readPermission(),
    () => null,
  );
  const [requesting, setRequesting] = useState(false);

  async function request() {
    if (state !== 'default') return;
    setRequesting(true);
    try {
      await Notification.requestPermission();
    } catch {
      // Some browsers throw on requestPermission (e.g. insecure origin).
      // Notification.permission이 'denied'로 세팅되어 있을 가능성이 크므로
      // 별도 처리 없이 event만 발화해 재렌더.
    } finally {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(PERMISSION_CHANGE_EVENT));
      }
      setRequesting(false);
    }
  }

  // Description is static across granted/default — badge/button on the
  // right already surfaces the state, so no need to repeat it in prose.
  // denied/unsupported get their own message with an actionable hint.
  const description =
    state === 'unsupported'
      ? '이 브라우저에서는 알림을 켤 수 없어요.'
      : state === 'denied'
        ? '주소창 자물쇠 → 사이트 설정 → 알림에서 다시 열어주세요.'
        : '휴식 타이머가 끝날 때 알려드릴게요.';

  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          알림
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {state === null ? ' ' : description}
        </p>
      </div>
      {state === 'default' ? (
        <button
          type="button"
          onClick={request}
          disabled={requesting}
          className="inline-flex min-h-11 shrink-0 items-center self-center rounded border border-zinc-300 bg-white px-3 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 md:min-h-0 md:py-1.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {requesting ? '요청 중…' : '허용 요청'}
        </button>
      ) : state === 'granted' ? (
        <span className="inline-flex shrink-0 items-center gap-1 self-center text-xs text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" aria-hidden />
          허용됨
        </span>
      ) : state === 'denied' || state === 'unsupported' ? (
        <span className="inline-flex shrink-0 items-center gap-1 self-center text-xs text-zinc-500">
          <BellOff className="h-3.5 w-3.5" aria-hidden />
          {state === 'denied' ? '차단됨' : '미지원'}
        </span>
      ) : null}
    </div>
  );
}
