'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { getWorkoutHeatmap } from '../lib/api';
import { logNotification } from '../lib/notif-log';
import { getMasterEnabled } from '../lib/notif-master';
import { toISODate } from '../lib/routines-week';
import {
  computeDaysSinceLastWorkout,
  DEFAULT_SKIP_DAYS,
  formatWorkoutSkipMessage,
  getEnabled,
  getSkipDays,
  markFiredToday,
  NOTIF_HOUR,
  subscribeSkipDays,
  wasFiredToday,
} from '../lib/workout-skip';

// 앱 진입 시 마운트되어 예약 시각에 최근 N일 운동 스킵 여부를 검사.
// morning-summary / routine-reminder 패턴 미러. 조건 미충족(임계 미달 or
// 방금 운동함)이면 조용히 스킵. 알림 클릭 시 /workouts로 이동.
export function WorkoutSkipReminder(): null {
  const router = useRouter();
  const skipDays = useSyncExternalStore<number>(
    subscribeSkipDays,
    () => getSkipDays(),
    () => DEFAULT_SKIP_DAYS,
  );
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fireIfSkipped() {
      if (cancelled) return;
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getMasterEnabled()) return;
      if (!getEnabled()) return;
      if (wasFiredToday()) return;

      // 조회 범위는 skipDays + 여유 1일. 즉 오늘까지 포함 총 (skipDays+1)일.
      const today = new Date();
      const from = new Date(today);
      from.setDate(from.getDate() - skipDays);
      let heatmap;
      try {
        heatmap = await getWorkoutHeatmap({
          from: toISODate(from),
          to: toISODate(today),
        });
      } catch {
        // 401(비인증) 등은 조용히 무시. 다음 진입에서 재시도.
        return;
      }
      if (cancelled) return;

      const daysSince = computeDaysSinceLastWorkout(heatmap, today);
      // 임계 미달(방금 운동함)이면 스킵.
      if (daysSince !== null && daysSince < skipDays) return;

      const { title, body } = formatWorkoutSkipMessage(daysSince);
      try {
        const notif = new Notification(title, {
          body,
          tag: 'rally-workout-skip',
          icon: '/flag-192.png',
        });
        notif.onclick = () => {
          try {
            window.focus();
          } catch {}
          router.push('/workouts');
        };
        markFiredToday();
        logNotification({
          type: 'workout-skip',
          title,
          body,
          href: '/workouts',
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
        void fireIfSkipped();
        return;
      }
      timeoutRef.current = window.setTimeout(() => {
        void fireIfSkipped();
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
  }, [skipDays, router]);

  return null;
}
