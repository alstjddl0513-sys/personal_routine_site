'use client';

import { useSyncExternalStore } from 'react';
import { getEnabled, setEnabled, subscribeEnabled } from '../../lib/deadline-notifier';
import { NotifItem } from './notif/NotifItem';

// 알림 설정 창 항목 — 저장은 lib/deadline-notifier 그대로, 모양은 NotifItem
export function DeadlineNotifRow() {
  const enabled = useSyncExternalStore<boolean | null>(subscribeEnabled, () => getEnabled(), () => null);
  return (
    <NotifItem
      title="채용 마감 알림"
      desc="앱을 열어둔 날 아침에 3일 뒤 또는 내일 마감인 회사가 있으면 각각 알려드릴게요."
      enabled={enabled}
      onToggle={(next) => setEnabled(next)}
    />
  );
}
