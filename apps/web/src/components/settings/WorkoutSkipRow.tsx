'use client';

import { useSyncExternalStore } from 'react';
import { Dumbbell } from 'lucide-react';
import {
  AVAILABLE_SKIP_DAYS,
  DEFAULT_SKIP_DAYS,
  getEnabled,
  getSkipDays,
  setEnabled,
  setSkipDays,
  subscribeEnabled,
  subscribeSkipDays,
} from '../../lib/workout-skip';
import { Select } from '../ui/Select';

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

export function WorkoutSkipRow() {
  const enabled = useSyncExternalStore<boolean | null>(
    subscribeEnabled,
    () => getEnabled(),
    () => null,
  );
  const skipDays = useSyncExternalStore<number>(
    subscribeSkipDays,
    () => getSkipDays(),
    () => DEFAULT_SKIP_DAYS,
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

  const skipDaysOptions = AVAILABLE_SKIP_DAYS.map((d) => ({
    value: String(d),
    label: `${d}일 이상`,
  }));

  const description = !isGranted
    ? '먼저 위의 알림 권한을 허용해주세요.'
    : '운동 기록이 없을 때 알려드릴게요.';

  const showControls = enabled !== null && isGranted;

  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
      <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          운동 스킵 리마인더
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {enabled === null ? ' ' : description}
        </p>
      </div>
      {showControls ? (
        <div className="flex shrink-0 items-center gap-2 self-center">
          <Select
            value={String(skipDays)}
            onChange={(v) => setSkipDays(Number(v))}
            options={skipDaysOptions}
            disabled={!enabled}
            ariaLabel="쉬는 일수"
            triggerClassName="min-h-11 justify-between gap-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-zinc-500 md:min-h-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          />
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            기록이 없을 때
          </span>
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
