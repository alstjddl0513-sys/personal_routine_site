'use client';

import { useEffect, useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { getEnabled, setEnabled } from '../../lib/deadline-notifier';

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

function readPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'default';
}

export function DeadlineNotifRow() {
  const [enabled, setEnabledState] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<PermissionState | null>(null);

  useEffect(() => {
    setEnabledState(getEnabled());
    setPermission(readPermission());
  }, []);

  const isGranted = permission === 'granted';

  function toggle() {
    if (enabled === null) return;
    const next = !enabled;
    setEnabled(next);
    setEnabledState(next);
  }

  const description = !isGranted
    ? '먼저 위의 알림 권한을 허용해주세요.'
    : '앱을 열어둔 날 아침에 내일 마감 회사가 있으면 한 번 알려드릴게요.';

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
