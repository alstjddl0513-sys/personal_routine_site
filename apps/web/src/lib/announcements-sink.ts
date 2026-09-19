// 서버 공지 sink. localStorage-only인 notif-log와 병존.
// useSyncExternalStore로 노출 → NotifBell 뱃지(미읽음 카운트) + NotifLogDrawer
// 목록(전체 노출)에 사용.
//
// 인박스 모델: 읽어도 계속 목록에 남되 readAt 필드로 시각 구분. 어드민이
// isActive=false 하거나 기간을 지나면 다음 refresh 때 서버에서 빠져 사라짐.

import type { UserAnnouncement } from '@repo/shared';
import { getMyAnnouncements, markAnnouncementRead } from './api';

const EMPTY: readonly UserAnnouncement[] = Object.freeze([]);
const CHANGE_EVENT = 'rally.announcements.changed';

let snapshot: readonly UserAnnouncement[] = EMPTY;
let inFlight: Promise<void> | null = null;

function emitChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getServerAnnouncements(): readonly UserAnnouncement[] {
  return snapshot;
}

// 종 뱃지에 노출되는 숫자 — 미읽음(readAt === null)만 카운트.
export function getServerAnnouncementsCount(): number {
  let n = 0;
  for (const a of snapshot) {
    if (a.readAt === null) n += 1;
  }
  return n;
}

export function subscribeAnnouncements(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  return () => window.removeEventListener(CHANGE_EVENT, cb);
}

// 서버에서 최신 목록 재로드. 중복 호출 방지 위해 single-flight.
export function refreshAnnouncements(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const rows = await getMyAnnouncements();
      snapshot = rows;
      emitChange();
    } catch (err) {
      console.warn('[announcements] refresh failed', err);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

// 서버에 읽음 처리 + 로컬 snapshot의 해당 항목에 readAt 스탬프. 목록에서
// 사라지지 않고 시각적으로 dim 처리되도록 in-place 업데이트.
export async function markAnnouncementReadAndSync(id: string): Promise<void> {
  try {
    await markAnnouncementRead(id);
  } catch (err) {
    console.warn('[announcements] markRead failed', err);
    return;
  }
  const nowIso = new Date().toISOString();
  snapshot = snapshot.map((a) =>
    a.id === id && a.readAt === null ? { ...a, readAt: nowIso } : a,
  );
  emitChange();
}

export function getAnnouncementsServerSnapshot(): readonly UserAnnouncement[] {
  return EMPTY;
}

// 로그아웃 시 호출. module-scope snapshot을 비워 이전 사용자 공지가 화면에
// 남지 않게. SPA 전환에서 페이지 refresh가 없으니 명시적 리셋 필요.
export function resetAnnouncements(): void {
  snapshot = EMPTY;
  emitChange();
}
