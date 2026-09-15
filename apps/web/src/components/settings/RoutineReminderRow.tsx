'use client';

import { useSyncExternalStore } from 'react';
import { ClipboardList } from 'lucide-react';
import {
  AVAILABLE_HOURS,
  DEFAULT_HOUR,
  getEnabled,
  getHour,
  setEnabled,
  setHour,
  subscribeEnabled,
  subscribeHour,
} from '../../lib/routine-reminder';

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

export function RoutineReminderRow() {
  const enabled = useSyncExternalStore<boolean | null>(
    subscribeEnabled,
    () => getEnabled(),
    () => null,
  );
  const hour = useSyncExternalStore<number>(
    subscribeHour,
    () => getHour(),
    () => DEFAULT_HOUR,
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

  function onHourChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setHour(Number(e.target.value));
  }

  const description = !isGranted
    ? '먼저 위의 알림 권한을 허용해주세요.'
    : '저녁에 오늘 미체크 시간블록이 있으면 알려드릴게요.';

  const showControls = enabled !== null && isGranted;

  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          루틴 리마인더
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {enabled === null ? ' ' : description}
        </p>
      </div>
      {showControls ? (
        <div className="flex shrink-0 items-center gap-2 self-center">
          <select
            value={hour}
            onChange={onHourChange}
            disabled={!enabled}
            aria-label="알림 시각"
            className="min-h-11 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-zinc-500 disabled:opacity-40 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {AVAILABLE_HOURS.map((h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
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
