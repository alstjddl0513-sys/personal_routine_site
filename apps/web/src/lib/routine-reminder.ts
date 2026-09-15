import type { RoutineCheck, TimeBlock } from '@repo/shared';
import { toISODate } from './routines-week';

// 저녁 루틴 리마인더 유틸. 서버 push 없이 앱 진입 시 로컬 계산 + setTimeout
// 예약 방식. deadline-notifier 패턴 미러. localStorage 키를 별도 도메인으로
// 분리(rally.notif.routine-evening.*).

export const DEFAULT_HOUR = 21;
export const AVAILABLE_HOURS = [19, 20, 21, 22, 23] as const;

const KEY_ENABLED = 'rally.notif.routine-evening.enabled';
const KEY_HOUR = 'rally.notif.routine-evening.hour';
const KEY_LAST_FIRED = 'rally.notif.routine-evening.last-fired';
const ENABLED_CHANGE_EVENT = 'rally.notif.routine-evening.enabled-changed';
const HOUR_CHANGE_EVENT = 'rally.notif.routine-evening.hour-changed';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ENABLED_CHANGE_EVENT));
  }
}

export function subscribeEnabled(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(ENABLED_CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(ENABLED_CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function getHour(): number {
  const s = storage();
  if (!s) return DEFAULT_HOUR;
  const raw = s.getItem(KEY_HOUR);
  if (raw === null) return DEFAULT_HOUR;
  const n = Number(raw);
  return (AVAILABLE_HOURS as readonly number[]).includes(n) ? n : DEFAULT_HOUR;
}

export function setHour(h: number): void {
  const s = storage();
  if (!s) return;
  if (!(AVAILABLE_HOURS as readonly number[]).includes(h)) return;
  s.setItem(KEY_HOUR, String(h));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(HOUR_CHANGE_EVENT));
  }
}

export function subscribeHour(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(HOUR_CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(HOUR_CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

// 로컬 시각 기준 오늘 ISO. 리마인더는 사용자 로컬 시각 21시 개념이라
// last-fired 판정도 로컬 자정 기준이 맞음(deadline-notifier의 KST 기준과 대조).
function todayLocalIso(): string {
  return toISODate(new Date());
}

export function wasFiredToday(): boolean {
  const s = storage();
  if (!s) return false;
  return s.getItem(KEY_LAST_FIRED) === todayLocalIso();
}

export function markFiredToday(): void {
  const s = storage();
  if (!s) return;
  s.setItem(KEY_LAST_FIRED, todayLocalIso());
}

// 활성 블록(archived 제외) 중 오늘 checks에 없는 것을 셈. RoutineTable의
// checkKey와 동일한 (blockId, date) 정합 키.
export function countUncheckedToday(
  blocks: TimeBlock[],
  checks: RoutineCheck[],
  todayIso: string,
): number {
  const active = blocks.filter((b) => !b.isArchived);
  if (active.length === 0) return 0;
  const checkedIds = new Set(
    checks.filter((c) => c.date === todayIso).map((c) => c.blockId),
  );
  return active.reduce((n, b) => n + (checkedIds.has(b.id) ? 0 : 1), 0);
}

export interface NotificationCopy {
  title: string;
  body: string;
}

export function formatReminderMessage(uncheckedCount: number): NotificationCopy {
  return {
    title: '오늘의 루틴',
    body: `아직 ${uncheckedCount}개 남았어요. 자기 전에 마무리해보세요.`,
  };
}
