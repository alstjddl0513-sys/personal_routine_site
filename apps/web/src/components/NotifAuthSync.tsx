'use client';

import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '../lib/supabase/client';
import { ensureLogScope } from '../lib/notif-log';
import {
  refreshAnnouncements,
  resetAnnouncements,
} from '../lib/announcements-sink';

// 알림 sink(브라우저 로그 + 서버 공지)와 Supabase auth state를 동기화.
// - INITIAL_SESSION / SIGNED_IN: 서버 공지 재fetch + 다른 유저 흔적 정리
// - TOKEN_REFRESHED: 서버 공지 재fetch(세션 만료 회복 후 최신화)
// - SIGNED_OUT: 서버 공지 sink만 리셋. notif-log(localStorage)는 유지 —
//   같은 계정 재로그인이면 이력이 그대로 남아야 자연스럽고, 다른 계정이
//   들어올 때는 SIGNED_IN 이벤트의 ensureLogScope가 이전 흔적 정리.
//
// RootLayout에 한 번만 마운트. NotifBell 안에서 하면 mount 시점 1회만
// 반응하고, 로그인/로그아웃 SPA 전환에선 Sidebar가 unmount 안 돼 놓친다.

export function NotifAuthSync() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === 'SIGNED_IN' ||
        event === 'INITIAL_SESSION' ||
        event === 'TOKEN_REFRESHED'
      ) {
        if (session?.user?.id) {
          ensureLogScope(session.user.id);
        }
        void refreshAnnouncements();
      } else if (event === 'SIGNED_OUT') {
        resetAnnouncements();
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}
