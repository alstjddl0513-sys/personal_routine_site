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
      desc="앱을 열어둔 날 아침에 3일 뒤 · 내일 · 오늘의 면접/시험/발표를 알려드릴게요."
      enabled={enabled}
      onToggle={(next) => setEnabled(next)}
    />
  );
}
