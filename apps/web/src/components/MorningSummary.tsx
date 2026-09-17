'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCompanies, getRoutineChecks, getTimeBlocks } from '../lib/api';
import {
  computeMorningSummary,
  formatMorningMessage,
  getEnabled,
  markFiredToday,
  NOTIF_HOUR,
  wasFiredToday,
} from '../lib/morning-summary';
import { logNotification } from '../lib/notif-log';
import { toISODate } from '../lib/routines-week';

// 앱 진입 시 마운트되어 아침 예약 시각에 오늘 마감/미체크 요약 알림.
// RoutineReminder 패턴 미러. 요약할 시그널이 하나도 없으면 조용히 스킵.
// 알림 클릭 시 마감이 우선, 없으면 루틴으로 이동.
export function MorningSummary(): null {
  const router = useRouter();
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fireIfNonEmpty() {
      if (cancelled) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getEnabled()) return;
      if (wasFiredToday()) return;

      const todayIso = toISODate(new Date());
      let rows, blocks, checks;
      try {
        [rows, blocks, checks] = await Promise.all([
          getCompanies(),
          getTimeBlocks(false),
          getRoutineChecks({ from: todayIso, to: todayIso }),
        ]);
      } catch {
        // 401(비인증) 등은 조용히 무시. 다음 진입에서 재시도.
        return;
      }
      if (cancelled) return;

      const summary = computeMorningSummary(rows, blocks, checks);
      if (summary.todayDeadlines === 0 && summary.uncheckedRoutines === 0) return;

      const { title, body } = formatMorningMessage(summary);
      try {
        const notif = new Notification(title, {
          body,
          tag: 'rally-morning-summary',
          icon: '/flag-192.png',
        });
        const href = summary.todayDeadlines > 0 ? '/jobs' : '/routines';
        notif.onclick = () => {
          try {
            window.focus();
          } catch {}
          router.push(href);
        };
        markFiredToday();
        logNotification({
          type: 'morning-summary',
          title,
          body,
          href,
        });
      } catch {
        // 일부 브라우저(iOS Safari 등) 지원 제한.
      }
    }

    function scheduleOrFireNow() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getEnabled()) return;
      if (wasFiredToday()) return;

      const now = new Date();
      const target = new Date(now);
      target.setHours(NOTIF_HOUR, 0, 0, 0);
      const delay = target.getTime() - now.getTime();

      if (delay <= 0) {
        void fireIfNonEmpty();
        return;
      }
      timeoutRef.current = window.setTimeout(() => {
        void fireIfNonEmpty();
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
