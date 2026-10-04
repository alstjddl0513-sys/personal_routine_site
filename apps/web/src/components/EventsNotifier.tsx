'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCompanies, getCompanyEvents } from '../lib/api';
import {
  addFiredIdsToday,
  formatEventMessage,
  getEnabled,
  getFiredIdsToday,
  pickEventsByDaysLeft,
  type EventWithCompany,
} from '../lib/event-notifier';
import { logNotification } from '../lib/notif-log';
import { getMasterEnabled } from '../lib/notif-master';
import { todayInSeoul, toISODate } from '../lib/routines-week';

// 캘린더 이벤트(면접/시험/발표) 임박 알림. 큰 값부터 작은 순 — D-3 먼저,
// D-1 그 다음, 당일(D-0) 마지막. 알림창에서 "가장 임박한 것"이 아래쪽에
// 쌓이도록. DeadlineNotifier와 동일 패턴.
const DAYS_LEFT_TARGETS = [3, 1, 0] as const;

function typeFromDaysLeft(
  daysLeft: number,
): 'event-d3' | 'event-d1' | 'event-today' {
  if (daysLeft === 3) return 'event-d3';
  if (daysLeft === 1) return 'event-d1';
  return 'event-today';
}

function fireForDay(
  daysLeft: number,
  events: EventWithCompany[],
  todayIsoKst: string,
  onClick: () => void,
): void {
  const all = pickEventsByDaysLeft(events, daysLeft, todayIsoKst);
  if (all.length === 0) return;

  const alreadyFired = getFiredIdsToday(daysLeft);
  const newItems = all.filter((e) => !alreadyFired.has(e.id));
  if (newItems.length === 0) return;

  const { title, body } = formatEventMessage(newItems, daysLeft);
  try {
    const notif = new Notification(title, {
      body,
      tag: `rally-event-d${daysLeft}`,
      icon: '/flag-192.png',
    });
    notif.onclick = onClick;
    addFiredIdsToday(
      daysLeft,
      newItems.map((e) => e.id),
    );
    logNotification({
      type: typeFromDaysLeft(daysLeft),
      title,
      body,
      href: '/calendar',
    });
  } catch {
    // 일부 브라우저 지원 제한. 무시.
  }
}

export function EventsNotifier(): null {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;
      if (!getMasterEnabled()) return;
      if (!getEnabled()) return;

      // CompanyEvent 자체엔 companyName이 없음. 회사 리스트와 조인 필요.
      // 3일 window만 조회 (오늘~오늘+3).
      const todayIsoKst = toISODate(todayInSeoul());
      const toIso = toISODate(
        new Date(
          new Date(todayIsoKst).getTime() + 3 * 86_400_000,
        ),
      );

      let events, companies;
      try {
        [events, companies] = await Promise.all([
          getCompanyEvents({ from: todayIsoKst, to: toIso }),
          getCompanies(),
        ]);
      } catch {
        return;
      }
      if (cancelled) return;

      const companyNameById = new Map(companies.map((c) => [c.id, c.name]));
      const enriched: EventWithCompany[] = events
        .map((e) => ({
          ...e,
          companyName: companyNameById.get(e.companyId) ?? '',
        }))
        .filter((e) => e.companyName.length > 0);

      const handleClick = () => {
        try {
          window.focus();
        } catch {}
        router.push('/calendar');
      };

      for (const daysLeft of DAYS_LEFT_TARGETS) {
        fireForDay(daysLeft, enriched, todayIsoKst, handleClick);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
