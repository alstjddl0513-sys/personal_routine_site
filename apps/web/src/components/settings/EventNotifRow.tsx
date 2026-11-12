'use client';

import { useSyncExternalStore } from 'react';
import { getEnabled, setEnabled, subscribeEnabled } from '../../lib/event-notifier';
import { NotifItem } from './notif/NotifItem';

// 알림 설정 창 항목 — 저장은 lib/event-notifier 그대로, 모양은 NotifItem
export function EventNotifRow() {
  const enabled = useSyncExternalStore<boolean | null>(subscribeEnabled, () => getEnabled(), () => null);
  return (
    <NotifItem
      title="캘린더 일정 알림"
      desc="면접·시험·발표 3일 전, 전날, 당일에 알려드릴게요."
      enabled={enabled}
      onToggle={(next) => setEnabled(next)}
    />
  );
}
