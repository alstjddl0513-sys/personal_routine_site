'use client';

import { useState, useSyncExternalStore } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadCount, subscribeLog } from '../lib/notif-log';
import { NotifLogDrawer } from './NotifLogDrawer';

// 종 + unread 뱃지. 클릭 시 드로어 오픈. Sidebar(데스크톱) 하단과
// SectionSubNav(모바일) 우측에 각각 마운트. md: 스위치로 동시 노출 X.
export function NotifBell() {
  const [open, setOpen] = useState(false);
  const unread = useSyncExternalStore<number>(
    subscribeLog,
    () => getUnreadCount(),
    () => 0,
  );

  const ariaLabel =
    unread > 0 ? `알림 내역 (읽지 않은 알림 ${unread}개)` : '알림 내역';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className="relative inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
      >
        <Bell className="h-3.5 w-3.5" aria-hidden />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute right-1 top-1 inline-flex h-1.5 w-1.5 rounded-full bg-rose-500"
          />
        ) : null}
      </button>
      <NotifLogDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
