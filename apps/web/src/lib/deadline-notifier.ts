import type { Company } from '@repo/shared';
import { computeUpcomingDeadlines, type UpcomingDeadline } from './jobs-stats';
import { todayInSeoul, toISODate } from './routines-week';

// 채용 마감 브라우저 알림 유틸. 서버 push 없이 앱 진입 시 로컬 계산 방식.
// localStorage로 하루 1회 가드(D-1/D-3 각각) + 사용자 개별 on/off 토글.

// 토글은 D-1/D-3 통합 하나. 설정 복잡도를 낮추기 위해 의도적으로 단일.
const KEY_ENABLED = 'rally.notif.deadline-d1.enabled';

function keyLastFired(daysLeft: number): string {
  return `rally.notif.deadline-d${daysLeft}.last-fired`;
}

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

// useSyncExternalStore 구독을 위한 동일 탭 변경 브로드캐스트. storage 이벤트는
// 다른 탭에서만 발화되므로 자기 탭의 토글 클릭도 반영되도록 이벤트를 쏨.
const CHANGE_EVENT = 'rally.notif.deadline-enabled-changed';

export function setEnabled(enabled: boolean): void {
  const s = storage();
  if (!s) return;
  s.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function subscribeEnabled(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

// KST 기준 오늘 이미 발송했는지. tab/디바이스 별로 관리됨(같은 유저라도 다른
// 브라우저면 중복 알림 가능 — 이 스코프에서는 감수).
export function wasFiredToday(daysLeft: number): boolean {
  const s = storage();
  if (!s) return false;
  const last = s.getItem(keyLastFired(daysLeft));
  return last === toISODate(todayInSeoul());
}

export function markFiredToday(daysLeft: number): void {
  const s = storage();
  if (!s) return;
  s.setItem(keyLastFired(daysLeft), toISODate(todayInSeoul()));
}

// D-N 마감인 활성 상태 회사만. computeUpcomingDeadlines(windowDays=N)이
// D-0..D-N을 함께 뱉으니 정확히 daysLeft로 좁힘. 오늘 마감(D-0)은 이미 늦은
// 경우가 많아 알림 대신 앱에서 배지로 보여주는 게 더 나음(별도 조각).
export function pickByDaysLeft(
  rows: Company[],
  daysLeft: number,
  now: Date = new Date(),
): UpcomingDeadline[] {
  return computeUpcomingDeadlines(rows, now, daysLeft).filter(
    (d) => d.daysLeft === daysLeft,
  );
}

export interface NotificationCopy {
  title: string;
  body: string;
}

function whenLabel(daysLeft: number): string {
  if (daysLeft === 1) return '내일';
  return `${daysLeft}일 뒤`;
}

// 집계 메시지. 2개 이하면 이름 전부, 3개 이상은 "외 N개".
export function formatDeadlineMessage(
  items: UpcomingDeadline[],
  daysLeft: number,
): NotificationCopy {
  if (items.length === 0) {
    return { title: '', body: '' };
  }
  const when = whenLabel(daysLeft);
  if (items.length === 1) {
    return {
      title: `${when} 마감 임박`,
      body: `${items[0].name} 지원 마감이 ${when}이에요.`,
    };
  }
  if (items.length === 2) {
    return {
      title: `${when} 마감 ${items.length}곳`,
      body: `${items[0].name}, ${items[1].name} 지원 마감이 ${when}이에요.`,
    };
  }
  const shown = items.slice(0, 2).map((i) => i.name).join(', ');
  return {
    title: `${when} 마감 ${items.length}곳`,
    body: `${shown} 외 ${items.length - 2}개 회사의 마감이 ${when}이에요.`,
  };
}
