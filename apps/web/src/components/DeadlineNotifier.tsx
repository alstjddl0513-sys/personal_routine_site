'use client';

import { useEffect } from 'react';
import { getCompanies } from '../lib/api';
import {
  formatD1Message,
  getEnabled,
  markFiredToday,
  pickD1Companies,
  wasFiredToday,
} from '../lib/deadline-notifier';

// 앱 진입 시 한 번 실행되는 클라이언트 훅. 여러 가드를 통과해야 발동:
//   1) 브라우저가 Notification API 지원
//   2) 사용자가 알림 permission을 granted
//   3) 앱 레벨 토글 켜져있음 (기본 true)
//   4) 오늘 아직 안 발송함 (localStorage guard)
//
// 인증 안 된 페이지(/login 등)에서도 마운트되지만 companies 401이 catch로
// 무시되고 별다른 side-effect 없음. 서버 push가 아니라 앱이 열려 있어야만
// 동작하는 게 명확한 한계 — 향후 Web Push 도입 시 대체.
export function DeadlineNotifier(): null {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getEnabled()) return;
      if (wasFiredToday()) return;

      let rows;
      try {
        rows = await getCompanies();
      } catch {
        // 401(비인증) 등은 조용히 무시. 다음 진입 때 다시 시도.
        return;
      }
      if (cancelled) return;

      const items = pickD1Companies(rows);
      if (items.length === 0) return;

      const { title, body } = formatD1Message(items);
      try {
        const notif = new Notification(title, {
          body,
          tag: 'rally-deadline-d1',
          icon: '/flag-192.png',
        });
        notif.onclick = () => {
          try {
            window.focus();
          } catch {}
          window.location.href = '/jobs';
        };
        // 실제 발송에 성공한 경우에만 mark. 오늘 D-1이 없을 때 mark 해두면
        // 하루 중 나중에 D-1 회사를 추가해도 알림이 안 뜨는 버그가 생김.
        markFiredToday();
      } catch {
        // 일부 브라우저(iOS Safari 등)는 지원 제한. 안전하게 무시.
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
