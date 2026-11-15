'use client';

import { useSyncExternalStore } from 'react';
import { Lock } from 'lucide-react';
import { getMasterEnabled, setMasterEnabled, subscribeMasterEnabled } from '../../lib/notif-master';
import { useNotifPermission } from '../../lib/notif-permission';
import { Switch } from '../ui/Switch';
import { SettingsDialog } from './SettingsDialog';
import { ChallengeCelebrateRow } from './ChallengeCelebrateRow';
import { DeadlineNotifRow } from './DeadlineNotifRow';
import { EventNotifRow } from './EventNotifRow';
import { MorningSummaryRow } from './MorningSummaryRow';
import { NotificationPermissionRow } from './NotificationPermissionRow';
import { RoutineReminderRow } from './RoutineReminderRow';
import { WorkoutSkipRow } from './WorkoutSkipRow';

interface Props {
  open: boolean;
  onClose: () => void;
}

// 알림 설정 창 — 맨 위 권한 상자 → "알림 전체" → 항목 6개. 스위치는 바꾸면 바로 저장(창 아래 버튼 없음).
// 권한이 없으면 항목은 지우지 않고 잠금 + 목록 위 자물쇠 한 줄. 알림 전체가 꺼지면 항목은 흐리게(지금 동작).
export function NotifSettingsModal({ open, onClose }: Props) {
  const master = useSyncExternalStore<boolean | null>(subscribeMasterEnabled, () => getMasterEnabled(), () => null);
  const permission = useNotifPermission();
  const lockLine =
    permission === 'default'
      ? '먼저 위의 알림 권한을 허용해주세요.'
      : permission === 'denied'
        ? '브라우저에서 알림을 다시 열면 켤 수 있어요.'
        : null;

  return (
    <SettingsDialog open={open} title="알림 설정" labelId="notif-settings-title" onClose={onClose}>
      <NotificationPermissionRow />
      {lockLine ? (
        <p className="-mb-2 flex items-center gap-1.5 text-[13px] text-ink-soft">
          <Lock className="h-3.5 w-3.5" aria-hidden />
          {lockLine}
        </p>
      ) : null}
      <ul className="flex flex-col">
        <li className="flex items-start justify-between gap-4 border-b border-divider py-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold text-ink-strong">알림 전체</span>
            <span className="text-[13px] text-ink-muted">모든 알림을 한번에 껐다 켜요.</span>
          </div>
          <span className="-my-2 -mr-2">
            <Switch
              label="알림 전체"
              checked={!!master}
              disabled={master === null}
              onChange={(next) => setMasterEnabled(next)}
            />
          </span>
        </li>
        <li className={master === false ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          <ul className="flex flex-col">
            <MorningSummaryRow />
            <DeadlineNotifRow />
            <EventNotifRow />
            <RoutineReminderRow />
            <WorkoutSkipRow />
            <ChallengeCelebrateRow />
          </ul>
        </li>
      </ul>
      {/* 두 항목 설명에서 뺀 조건 — 목록과 divider로 붙인 창 아래 각주(떠 보이지 않게) */}
      <p className="-mt-4.5 border-t border-divider pt-3 text-xs text-ink-muted">
        채용 마감 · 캘린더 일정 알림은 앱을 연 날 아침에 알려드릴게요.
      </p>
    </SettingsDialog>
  );
}
