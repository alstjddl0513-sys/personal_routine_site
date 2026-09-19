'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Bell, X } from 'lucide-react';
import {
  getMasterEnabled,
  setMasterEnabled,
  subscribeMasterEnabled,
} from '../../lib/notif-master';
import { Portal } from '../ui/Portal';
import { DeadlineNotifRow } from './DeadlineNotifRow';
import { MorningSummaryRow } from './MorningSummaryRow';
import { NotificationPermissionRow } from './NotificationPermissionRow';
import { RoutineReminderRow } from './RoutineReminderRow';
import { WorkoutSkipRow } from './WorkoutSkipRow';

interface Props {
  open: boolean;
  onClose: () => void;
}

// 알림 관련 세부 토글들을 모아 보여주는 중앙 모달. 설정 페이지 섹션이
// 5개 로우로 길어져 진입점만 남기고 여기로 이관. 각 Row 컴포넌트는
// 그대로 재사용(로직/스토어 변경 X).
//
// NotifLogDrawer의 Esc + backdrop click + body 스크롤 잠금 패턴 미러.
// 우측 슬라이드 대신 중앙 배치.
export function NotifSettingsModal({ open, onClose }: Props) {
  const master = useSyncExternalStore<boolean | null>(
    subscribeMasterEnabled,
    () => getMasterEnabled(),
    () => null,
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-settings-title"
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-lg pb-[env(safe-area-inset-bottom)] md:max-h-[calc(100vh-2rem)] md:max-w-2xl md:rounded-lg md:pb-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300 md:hidden dark:bg-zinc-700"
          />
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-zinc-500" aria-hidden />
              <h2
                id="notif-settings-title"
                className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                알림 설정
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            <MasterBanner
              enabled={master}
              onToggle={() => {
                if (master === null) return;
                setMasterEnabled(!master);
              }}
            />
            <div
              className={
                master === false
                  ? 'pointer-events-auto opacity-50 transition-opacity'
                  : 'transition-opacity'
              }
            >
              <NotificationPermissionRow />
              <MorningSummaryRow />
              <DeadlineNotifRow />
              <RoutineReminderRow />
              <WorkoutSkipRow />
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

interface MasterBannerProps {
  enabled: boolean | null;
  onToggle: () => void;
}

function MasterBanner({ enabled, onToggle }: MasterBannerProps) {
  return (
    <div className="flex items-start gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <Bell
        className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          알림 전체
        </div>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          모든 알림을 한번에 껐다 켜요.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled ?? false}
        onClick={onToggle}
        disabled={enabled === null}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center self-center rounded-full border transition-colors ${
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
  );
}
