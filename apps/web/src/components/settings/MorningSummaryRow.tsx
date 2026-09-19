'use client';

import { useSyncExternalStore } from 'react';
import { Sunrise } from 'lucide-react';
import {
  getEnabled,
  setEnabled,
  subscribeEnabled,
} from '../../lib/morning-summary';

type PermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

function readPermission(): PermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'default';
}

function subscribeNoop(): () => void {
  return () => {};
}

export function MorningSummaryRow() {
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
    : '아침에 오늘 마감과 미체크 루틴을 한번에 알려드릴게요.';

  const showControls = enabled !== null && isGranted;

  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <Sunrise className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          아침 요약
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {enabled === null ? ' ' : description}
        </p>
      </div>
      {showControls ? (
        <div className="flex shrink-0 items-center gap-2 self-center">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={toggle}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
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
        </div>
      ) : null}
    </div>
  );
}
