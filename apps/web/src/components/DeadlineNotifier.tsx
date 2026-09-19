'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Company } from '@repo/shared';
import { getCompanies } from '../lib/api';
import {
  addFiredIdsToday,
  formatDeadlineMessage,
  getEnabled,
  getFiredIdsToday,
  pickByDaysLeft,
} from '../lib/deadline-notifier';
import { logNotification } from '../lib/notif-log';
import { getMasterEnabled } from '../lib/notif-master';

// 앱 진입 시 한 번 실행되는 클라이언트 훅. D-3과 D-1을 각각 검사·발송.
// 여러 가드를 통과해야 발동:
//   1) 브라우저가 Notification API 지원
//   2) 사용자가 알림 permission을 granted
//   3) 앱 레벨 토글 켜져있음 (기본 true)
//   4) 해당 daysLeft에서 오늘 아직 안 발송된 회사가 있음 (회사 단위 추적)
//
// 오늘 이미 D-1 알림 받은 후 새 회사를 추가하면, 그 회사만 대상으로 새로
// 알림이 발송됨(기존에 알림 받은 회사는 스팸 방지 목적으로 스킵).
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
  const all = pickByDaysLeft(rows, daysLeft);
  if (all.length === 0) return;

  // 오늘 이 daysLeft에 이미 알림 받은 회사 id 제외 → 새 회사만.
  const alreadyFired = getFiredIdsToday(daysLeft);
  const newItems = all.filter((item) => !alreadyFired.has(item.id));
  if (newItems.length === 0) return;

  const { title, body } = formatDeadlineMessage(newItems, daysLeft);
  try {
    const notif = new Notification(title, {
      body,
      tag: `rally-deadline-d${daysLeft}`,
      icon: '/flag-192.png',
    });
    notif.onclick = onClick;
    // 발송 성공한 회사만 마커에 union. 나중에 회사 삭제/deadline 변경 시에도
    // 이 마커는 그대로라 오늘 다시 알림 안 옴 — 스팸 방지 목적으로 감수.
    addFiredIdsToday(
      daysLeft,
      newItems.map((i) => i.id),
    );
    logNotification({
      type: daysLeft === 1 ? 'deadline-d1' : 'deadline-d3',
      title,
      body,
      href: '/jobs/statistics',
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
      if (!getMasterEnabled()) return;
      if (!getEnabled()) return;

      let rows;
      try {
        rows = await getCompanies();
      } catch {
        // 401(비인증) 등은 조용히 무시. 다음 진입 때 다시 시도.
        return;
      }
      if (cancelled) return;

      // 알림 클릭 → 기업 통계의 마감 임박 카드로 바로. /jobs는 전체 표라
      // 사용자가 스크롤/필터해서 마감 임박을 찾아야 하지만, /jobs/statistics는
      // 마감 임박 리스트가 상단에 노출돼 액션 동선 최소화.
      const handleClick = () => {
        try {
          window.focus();
        } catch {}
        router.push('/jobs/statistics');
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
