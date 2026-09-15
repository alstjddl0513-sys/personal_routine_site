'use client';

import { useSyncExternalStore } from 'react';
import { CalendarClock } from 'lucide-react';
import { getEnabled, setEnabled, subscribeEnabled } from '../../lib/deadline-notifier';

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

function readPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'default';
}

// permission은 브라우저 API라 표준 change 이벤트가 없음. 세션 중 바뀔 일도
// 거의 없으니 subscribe는 no-op — 초기 hydration 후 한 번 읽는 걸로 충분.
function subscribeNoop(): () => void {
  return () => {};
}

export function DeadlineNotifRow() {
  const enabled = useSyncExternalStore<boolean | null>(
    subscribeEnabled,
    () => getEnabled(),
    () => null,
  );
  const permission = useSyncExternalStore<PermissionState | null>(
    subscribeNoop,
    () => readPermission(),
    () => null,
  );

  const isGranted = permission === 'granted';

  function toggle() {
    if (enabled === null) return;
    setEnabled(!enabled);
  }

  const description = !isGranted
    ? '먼저 위의 알림 권한을 허용해주세요.'
    : '앱을 열어둔 날 아침에 3일 뒤 또는 내일 마감인 회사가 있으면 각각 알려드릴게요.';

  const showToggle = enabled !== null && isGranted;

  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          채용 마감 알림
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {enabled === null ? ' ' : description}
        </p>
      </div>
      {showToggle ? (
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center self-center rounded-full border transition-colors ${
            enabled
              ? 'border-emerald-500 bg-emerald-500'
              : 'border-zinc-300 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      ) : null}
    </div>
  );
}
