'use client';

import { useSyncExternalStore } from 'react';
import { getEnabled, setEnabled, subscribeEnabled } from '../../lib/challenge-notifier';
import { NotifItem } from './notif/NotifItem';

// 알림 설정 창 항목 — 저장은 lib/challenge-notifier 그대로, 모양은 NotifItem
export function ChallengeCelebrateRow() {
  const enabled = useSyncExternalStore<boolean | null>(subscribeEnabled, () => getEnabled(), () => null);
  return (
    <NotifItem
      title="챌린지 완주 축하"
      desc="챌린지를 끝까지 지킨 날 축하 알림을 띄워드릴게요."
      enabled={enabled}
      onToggle={(next) => setEnabled(next)}
    />
  );
}
