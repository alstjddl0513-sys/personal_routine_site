'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getRoutineChallenges } from '../lib/api';
import {
  addFiredIdsToday,
  formatCompletionMessage,
  getEnabled,
  getFiredIdsToday,
  isCompletedToday,
} from '../lib/challenge-notifier';
import { logNotification } from '../lib/notif-log';
import { getMasterEnabled } from '../lib/notif-master';

// 챌린지 완주 하이라이트. 서버가 target 달성 시 자동 completed로 전환 →
// completedAt(ISO ts)이 KST 오늘인 챌린지를 pick해서 축하 알림.
// 하루 1회 가드(id 단위). 서버 자동 전환 후 유저가 /routines 안 들어가도
// 다른 페이지 진입만으로 알림이 뜸.
export function ChallengeCelebrator(): null {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getMasterEnabled()) return;
      if (!getEnabled()) return;

      let challenges;
      try {
        challenges = await getRoutineChallenges('completed');
      } catch {
        return;
      }
      if (cancelled) return;

      // 오늘 completed로 전환된 것만, 그리고 아직 축하 안 뜬 것만.
      const completedTodayList = challenges.filter((c) =>
        isCompletedToday(c.completedAt),
      );
      if (completedTodayList.length === 0) return;

      const alreadyFired = getFiredIdsToday();
      const newItems = completedTodayList.filter(
        (c) => !alreadyFired.has(c.id),
      );
      if (newItems.length === 0) return;

      const titles = newItems.map((c) => c.title);
      const { title, body } = formatCompletionMessage(titles);

      try {
        const notif = new Notification(title, {
          body,
          tag: 'rally-challenge-completed',
          icon: '/flag-192.png',
        });
        notif.onclick = () => {
          try {
            window.focus();
          } catch {}
          router.push('/routines');
        };
        addFiredIdsToday(newItems.map((c) => c.id));
        logNotification({
          type: 'challenge-completed',
          title,
          body,
          href: '/routines',
        });
      } catch {
        // ignore
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
