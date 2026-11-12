'use client';

import { useSyncExternalStore } from 'react';
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
import { Segment } from '../ui/Segment';
import { NotifItem } from './notif/NotifItem';

// 알림 설정 창 항목 — 켜져 있으면 줄 아래 "며칠째 기록이 없을 때" 세그먼트(값 3·5·7·14 그대로)
export function WorkoutSkipRow() {
  const enabled = useSyncExternalStore<boolean | null>(subscribeEnabled, () => getEnabled(), () => null);
  const skipDays = useSyncExternalStore<number>(subscribeSkipDays, () => getSkipDays(), () => DEFAULT_SKIP_DAYS);
  return (
    <NotifItem
      title="운동 건너뜀 알림"
      desc="운동 기록이 없을 때 알려드릴게요."
      enabled={enabled}
      onToggle={(next) => setEnabled(next)}
      extra={(locked) => (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className={`text-[13px] ${locked ? 'text-icon-faint' : 'text-ink-soft'}`}>며칠째 기록이 없을 때</span>
          <Segment
            label="며칠째 기록이 없을 때"
            size="sm"
            disabled={locked}
            value={skipDays}
            onChange={(d) => setSkipDays(d)}
            options={AVAILABLE_SKIP_DAYS.map((d) => ({ value: d as number, label: `${d}일` }))}
          />
        </div>
      )}
    />
  );
}
