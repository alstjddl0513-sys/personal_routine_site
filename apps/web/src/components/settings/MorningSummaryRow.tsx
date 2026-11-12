'use client';

import { useSyncExternalStore } from 'react';
import { getEnabled, setEnabled, subscribeEnabled } from '../../lib/morning-summary';
import { NotifItem } from './notif/NotifItem';

// 알림 설정 창 항목 — 저장은 lib/morning-summary 그대로, 모양은 NotifItem
export function MorningSummaryRow() {
  const enabled = useSyncExternalStore<boolean | null>(subscribeEnabled, () => getEnabled(), () => null);
  return (
    <NotifItem
      title="아침 요약"
      desc="아침에 오늘 마감과 아직 안 한 루틴을 한 번에 알려드릴게요."
      enabled={enabled}
      onToggle={(next) => setEnabled(next)}
    />
  );
}
