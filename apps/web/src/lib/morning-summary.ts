import type { Company, RoutineCheck, TimeBlock } from '@repo/shared';
import { countUncheckedToday } from './routine-reminder';
import { toISODate } from './routines-week';

// 아침 요약 브라우저 알림 유틸. routine-reminder 패턴 미러. localStorage
// 키/이벤트 도메인만 `morning-summary.*`로 분리.

export const DEFAULT_HOUR = 8;
export const AVAILABLE_HOURS = [7, 8, 9, 10] as const;

const KEY_ENABLED = 'rally.notif.morning-summary.enabled';
const KEY_HOUR = 'rally.notif.morning-summary.hour';
const KEY_LAST_FIRED = 'rally.notif.morning-summary.last-fired';
const ENABLED_CHANGE_EVENT = 'rally.notif.morning-summary.enabled-changed';
const HOUR_CHANGE_EVENT = 'rally.notif.morning-summary.hour-changed';

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

// 로컬 시각 기준 오늘 ISO. routine-reminder와 동일 (로컬 자정 기준).
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

export interface MorningSummaryCounts {
  todayDeadlines: number;
  uncheckedRoutines: number;
}

// ACTIVE 상태(not_applied ~ interview_2_passed)이고 마감이 로컬 오늘인 회사 수.
// computeUpcomingDeadlines 로직을 D-day만 필터로 축약. 지원 완료/최종 상태는 제외.
const ACTIVE_STATUSES = new Set<string>([
  'not_applied',
  'applied',
  'document_passed',
  'interview_1_passed',
  'interview_2_passed',
]);

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function countTodayDeadlines(rows: Company[], now: Date = new Date()): number {
  let n = 0;
  for (const c of rows) {
    if (!c.applicationDeadline) continue;
    if (!ACTIVE_STATUSES.has(c.applicationStatus)) continue;
    if (isSameLocalDay(new Date(c.applicationDeadline), now)) n += 1;
  }
  return n;
}

export function computeMorningSummary(
  rows: Company[],
  blocks: TimeBlock[],
  checks: RoutineCheck[],
  now: Date = new Date(),
): MorningSummaryCounts {
  const todayIso = toISODate(now);
  return {
    todayDeadlines: countTodayDeadlines(rows, now),
    uncheckedRoutines: countUncheckedToday(blocks, checks, todayIso),
  };
}

export interface NotificationCopy {
  title: string;
  body: string;
}

export function formatMorningMessage(
  summary: MorningSummaryCounts,
): NotificationCopy {
  const parts: string[] = [];
  if (summary.todayDeadlines > 0) parts.push(`오늘 마감 ${summary.todayDeadlines}건`);
  if (summary.uncheckedRoutines > 0)
    parts.push(`미체크 루틴 ${summary.uncheckedRoutines}개`);
  return {
    title: '오늘의 하루',
    body: parts.length > 0 ? `${parts.join(' · ')} 남았어요.` : '',
  };
}
