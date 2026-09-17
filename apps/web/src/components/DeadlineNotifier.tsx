'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '@repo/shared';
import { getCompanies } from '../lib/api';
import {
  formatDeadlineMessage,
  getEnabled,
  markFiredToday,
  pickByDaysLeft,
  wasFiredToday,
} from '../lib/deadline-notifier';
import { logNotification } from '../lib/notif-log';

// 앱 진입 시 한 번 실행되는 클라이언트 훅. D-3과 D-1을 각각 검사·발송.
// 여러 가드를 통과해야 발동:
//   1) 브라우저가 Notification API 지원
//   2) 사용자가 알림 permission을 granted
//   3) 앱 레벨 토글 켜져있음 (기본 true)
//   4) 해당 daysLeft가 오늘 아직 안 발송됨 (localStorage guard, D-1/D-3 별도)
//
// 인증 안 된 페이지(/login 등)에서도 마운트되지만 companies 401이 catch로
// 무시되고 별다른 side-effect 없음. 서버 push가 아니라 앱이 열려 있어야만
// 동작하는 게 명확한 한계 — 향후 Web Push 도입 시 대체.

// 큰 값부터 → 작은 값 순으로 발송. 3일 뒤/내일 두 알림이 동시에 뜰 때
// 사용자가 "임박한 것"(D-1)을 마지막에 보게 되어 우선순위와 일치.
const DAYS_LEFT_TARGETS = [3, 1] as const;

function fireForDay(
  daysLeft: number,
  rows: Company[],
  onClick: () => void,
): void {
  if (wasFiredToday(daysLeft)) return;
  const items = pickByDaysLeft(rows, daysLeft);
  if (items.length === 0) return;

  const { title, body } = formatDeadlineMessage(items, daysLeft);
  try {
    const notif = new Notification(title, {
      body,
      tag: `rally-deadline-d${daysLeft}`,
      icon: '/flag-192.png',
    });
    notif.onclick = onClick;
    // 실제 발송에 성공한 경우에만 mark. items 없을 때 mark 해두면
    // 하루 중 나중에 회사를 추가해도 알림이 안 뜨는 버그가 생김.
    markFiredToday(daysLeft);
    logNotification({
      type: daysLeft === 1 ? 'deadline-d1' : 'deadline-d3',
      title,
      body,
      href: '/jobs',
    });
  } catch {
    // 일부 브라우저(iOS Safari 등)는 지원 제한. 안전하게 무시.
  }
}

export function DeadlineNotifier(): null {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getEnabled()) return;
      // 오늘 이미 D-1/D-3 모두 발송됐다면 fetch도 스킵.
      if (DAYS_LEFT_TARGETS.every((d) => wasFiredToday(d))) return;

      let rows;
      try {
        rows = await getCompanies();
      } catch {
        // 401(비인증) 등은 조용히 무시. 다음 진입 때 다시 시도.
        return;
      }
      if (cancelled) return;

      const handleClick = () => {
        try {
          window.focus();
        } catch {}
        router.push('/jobs');
      };
      for (const daysLeft of DAYS_LEFT_TARGETS) {
        fireForDay(daysLeft, rows, handleClick);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
