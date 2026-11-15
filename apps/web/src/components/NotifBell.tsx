'use client';

import { useState, useSyncExternalStore } from 'react';
import { Bell } from 'lucide-react';
import { getUnreadCount, subscribeLog } from '../lib/notif-log';
import {
  getServerAnnouncementsCount,
  subscribeAnnouncements,
} from '../lib/announcements-sink';
import { NotifLogDrawer } from './NotifLogDrawer';
import { NotifSettingsModal } from './settings/NotifSettingsModal';

// 종 + unread 뱃지. 클릭 시 드로어 오픈. Sidebar(데스크톱) 하단과
// SectionSubNav(모바일) 우측에 각각 마운트. md: 스위치로 동시 노출 X.
// unread = 브라우저 로그(notif-log) + 서버 공지(announcements-sink).
// 서버 공지 fetch는 RootLayout의 NotifAuthSync가 auth state 이벤트에서 트리거.
const DEFAULT_CLASS =
  'relative inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-100';

const DEFAULT_DOT = 'absolute right-1 top-1 inline-flex h-1.5 w-1.5 rounded-full bg-rose-500';

// className: 사이드바처럼 배경이 다른 곳에서 버튼 색만 바꿀 때 (relative 포함해서 넘길 것).
// unreadClassName · dotClassName: 안 읽음이 있을 때 버튼 · 점 모양(사이드바 — rally-notif-drawer-parts). 없으면 기본(모바일).
export function NotifBell({
  className = DEFAULT_CLASS,
  unreadClassName,
  dotClassName = DEFAULT_DOT,
}: {
  className?: string;
  unreadClassName?: string;
  dotClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  // 드로어 빈 상태 [알림 설정하기] — 드로어를 닫고 설정의 알림 창을 그대로 엶
  const [settingsOpen, setSettingsOpen] = useState(false);
  const localUnread = useSyncExternalStore<number>(
    subscribeLog,
    () => getUnreadCount(),
    () => 0,
  );
  const serverUnread = useSyncExternalStore<number>(
    subscribeAnnouncements,
    () => getServerAnnouncementsCount(),
    () => 0,
  );

  const unread = localUnread + serverUnread;
  const ariaLabel =
    unread > 0 ? `알림 내역 (읽지 않은 알림 ${unread}개)` : '알림 내역';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel}
        className={unread > 0 && unreadClassName ? unreadClassName : className}
      >
        <Bell className="h-3.5 w-3.5" aria-hidden />
        {unread > 0 ? (
          <span
            aria-hidden
            className={dotClassName}
          />
        ) : null}
      </button>
      <NotifLogDrawer
        open={open}
        onClose={() => setOpen(false)}
        onOpenSettings={() => {
          setOpen(false);
          setSettingsOpen(true);
        }}
      />
      <NotifSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
