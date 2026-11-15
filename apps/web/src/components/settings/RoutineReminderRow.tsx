'use client';

import { useSyncExternalStore } from 'react';
import { getEnabled, setEnabled, subscribeEnabled } from '../../lib/routine-reminder';
import { NotifItem } from './notif/NotifItem';

// 알림 설정 창 항목 — 저장은 lib/routine-reminder 그대로, 모양은 NotifItem
export function RoutineReminderRow() {
  const enabled = useSyncExternalStore<boolean | null>(subscribeEnabled, () => getEnabled(), () => null);
  return (
    <NotifItem
      title="루틴 저녁 알림"
      desc="저녁에 오늘 아직 안 한 루틴이 있으면 알려드릴게요."
      enabled={enabled}
      onToggle={(next) => setEnabled(next)}
    />
  );
}
