import type { Company } from '@repo/shared';
import { computeUpcomingDeadlines, type UpcomingDeadline } from './jobs-stats';
import { todayInSeoul, toISODate } from './routines-week';

// 채용 마감 D-1 브라우저 알림 유틸. 서버 push 없이 앱 진입 시 로컬 계산 방식.
// localStorage로 하루 1회 가드 + 사용자 개별 on/off 토글.

const KEY_ENABLED = 'rally.notif.deadline-d1.enabled';
const KEY_LAST_FIRED = 'rally.notif.deadline-d1.last-fired';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// 기본 true — permission이 granted 아니면 어차피 발동 X이므로 안전.
export function getEnabled(): boolean {
  const s = storage();
  if (!s) return true;
  const v = s.getItem(KEY_ENABLED);
  if (v === null) return true;
  return v === 'true';
}

export function setEnabled(enabled: boolean): void {
  const s = storage();
  if (!s) return;
  s.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
}

// KST 기준 오늘 이미 발송했는지. tab/디바이스 별로 관리됨(같은 유저라도 다른
// 브라우저면 중복 알림 가능 — 이 스코프에서는 감수).
export function wasFiredToday(): boolean {
  const s = storage();
  if (!s) return false;
  const last = s.getItem(KEY_LAST_FIRED);
  return last === toISODate(todayInSeoul());
}

export function markFiredToday(): void {
  const s = storage();
  if (!s) return;
  s.setItem(KEY_LAST_FIRED, toISODate(todayInSeoul()));
}

// 내일 마감(D-1)인 활성 상태 회사만. computeUpcomingDeadlines(windowDays=1)이
// D-0과 D-1을 함께 뱉으니 daysLeft === 1로 좁힘. 오늘 마감(D-0)은 이미 늦은
// 경우가 많아 알림 대신 앱에서 배지로 보여주는 게 더 나음(별도 조각).
export function pickD1Companies(
  rows: Company[],
  now: Date = new Date(),
): UpcomingDeadline[] {
  return computeUpcomingDeadlines(rows, now, 1).filter((d) => d.daysLeft === 1);
}

export interface NotificationCopy {
  title: string;
  body: string;
}

// 집계 메시지. 2개 이하면 이름 전부, 3개 이상은 "외 N개".
export function formatD1Message(items: UpcomingDeadline[]): NotificationCopy {
  if (items.length === 0) {
    return { title: '', body: '' };
  }
  if (items.length === 1) {
    return {
      title: '내일 마감 임박',
      body: `${items[0].name} 지원 마감이 내일이에요.`,
    };
  }
  if (items.length === 2) {
    return {
      title: `내일 마감 ${items.length}곳`,
      body: `${items[0].name}, ${items[1].name} 지원 마감이 내일이에요.`,
    };
  }
  const shown = items.slice(0, 2).map((i) => i.name).join(', ');
  return {
    title: `내일 마감 ${items.length}곳`,
    body: `${shown} 외 ${items.length - 2}개 회사의 마감이 내일이에요.`,
  };
}
