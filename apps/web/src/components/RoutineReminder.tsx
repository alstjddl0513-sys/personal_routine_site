'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getRoutineChecks, getTimeBlocks } from '../lib/api';
import { logNotification } from '../lib/notif-log';
import { getMasterEnabled } from '../lib/notif-master';
import {
  countUncheckedToday,
  formatReminderMessage,
  getEnabled,
  markFiredToday,
  NOTIF_HOUR,
  wasFiredToday,
} from '../lib/routine-reminder';
import { toISODate } from '../lib/routines-week';

// 앱 진입 시 마운트되어 저녁 예약 시각에 오늘 미체크가 있으면 알림.
// 여러 가드:
//   1) Notification API 지원 + permission granted
//   2) 사용자 토글 on (기본 true)
//   3) 오늘 아직 안 발송 (localStorage 가드, 로컬 자정 기준)
//   4) 예약 시각 도달 (현재 >= 시각이면 즉시, 아니면 setTimeout으로 예약)
//
// 인증 안 된 페이지(/login 등)에서도 마운트되지만 fetch 401은 catch로 무시.
// 서버 push가 아니라 앱이 열려 있어야만 동작 — Web Push 도입 시 대체.
//
// useSyncExternalStore로 hour subscribe → 사용자가 시각 바꾸면 useEffect 재실행,
// 기존 setTimeout cancel + 재예약.
export function RoutineReminder(): null {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fireIfUnchecked() {
      if (cancelled) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getMasterEnabled()) return;
      if (!getEnabled()) return;
      if (wasFiredToday()) return;

      const todayIso = toISODate(new Date());
      let blocks;
      let checks;
      try {
        [blocks, checks] = await Promise.all([
          getTimeBlocks(false),
          getRoutineChecks({ from: todayIso, to: todayIso }),
        ]);
      } catch {
        // 401(비인증) 등은 조용히 무시. 다음 진입/재예약 때 다시 시도.
        return;
      }
      if (cancelled) return;

      const remaining = countUncheckedToday(blocks, checks, todayIso);
      if (remaining === 0) return;

      const { title, body } = formatReminderMessage(remaining);
      try {
        const notif = new Notification(title, {
          body,
          tag: 'rally-routine-evening',
          icon: '/flag-192.png',
        });
        notif.onclick = () => {
          try {
            window.focus();
          } catch {}
          router.push('/routines');
        };
        markFiredToday();
        logNotification({
          type: 'routine-reminder',
          title,
          body,
          href: '/routines',
        });
      } catch {
        // 일부 브라우저(iOS Safari 등) 지원 제한.
      }
    }

    function scheduleOrFireNow() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getMasterEnabled()) return;
      if (!getEnabled()) return;
      if (wasFiredToday()) return;

      const now = new Date();
      const target = new Date(now);
      target.setHours(NOTIF_HOUR, 0, 0, 0);
      const delay = target.getTime() - now.getTime();

      if (delay <= 0) {
        void fireIfUnchecked();
        return;
      }
      timeoutRef.current = window.setTimeout(() => {
        void fireIfUnchecked();
      }, delay);
    }

    scheduleOrFireNow();

    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [router]);

  return null;
}
