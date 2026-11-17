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
// 모양은 놓이는 곳(사이드바 · 모바일 위 줄)마다 달라서 쓰는 쪽이 정함:
// className = 버튼(relative 포함), dotClassName = 안 읽음 점, unreadClassName = 안 읽음일 때 버튼(사이드바만).
export function NotifBell({
  className,
  unreadClassName,
  dotClassName,
  iconClassName = 'h-3.5 w-3.5',
}: {
  className: string;
  unreadClassName?: string;
  dotClassName: string;
  /** 종 아이콘 크기(모바일 상단 줄은 20px) */
  iconClassName?: string;
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
        <Bell className={iconClassName} aria-hidden />
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
