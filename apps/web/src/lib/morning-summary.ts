import type { Company, RoutineCheck, TimeBlock } from '@repo/shared';
import { countUncheckedToday } from './routine-reminder';
import { toISODate } from './routines-week';

// 아침 요약 브라우저 알림 유틸. routine-reminder 패턴 미러. localStorage
// 키/이벤트 도메인만 `morning-summary.*`로 분리.
//
// 알림 시각은 고정. 사용자 커스텀 대신 감성적으로 자연스러운 시간 하나로
// 통일해 설정 UI를 심플하게 유지. 필요해지면 다시 유연화 가능.

export const NOTIF_HOUR = 8;

const KEY_ENABLED = 'rally.notif.morning-summary.enabled';
const KEY_LAST_FIRED = 'rally.notif.morning-summary.last-fired';
export const CHANGE_EVENT_NAME = 'rally.notif.morning-summary.enabled-changed';
const ENABLED_CHANGE_EVENT = CHANGE_EVENT_NAME;

// PreferencesSyncClient가 자기 dispatch를 재소비해 upload를 다시 트리거하는
// 루프 방지용. setEnabledSilent 중일 때만 true.
let applyingRemote = false;
export function isApplyingRemote(): boolean {
  return applyingRemote;
}

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

export function setEnabledSilent(enabled: boolean): void {
  const s = storage();
  if (!s) return;
  applyingRemote = true;
  try {
    s.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(ENABLED_CHANGE_EVENT));
    }
  } finally {
    applyingRemote = false;
  }
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
  todayDeadlineNames: string[];
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
  return pickTodayDeadlineNames(rows, now).length;
}

// 오늘 마감인 ACTIVE 상태 회사 이름 목록. formatMorningMessage가 1건일 때
// 회사명을 문구에 넣기 위해 사용. 2건 이상은 카운트만 노출(문구 폭발 방지).
export function pickTodayDeadlineNames(
  rows: Company[],
  now: Date = new Date(),
): string[] {
  const names: string[] = [];
  for (const c of rows) {
    if (!c.applicationDeadline) continue;
    // 상시채용은 고정 마감이 없어 오늘 마감 개념 불가.
    if (c.isRolling) continue;
    if (!ACTIVE_STATUSES.has(c.applicationStatus)) continue;
    if (isSameLocalDay(new Date(c.applicationDeadline), now)) names.push(c.name);
  }
  return names;
}

export function computeMorningSummary(
  rows: Company[],
  blocks: TimeBlock[],
  checks: RoutineCheck[],
  now: Date = new Date(),
): MorningSummaryCounts {
  const todayIso = toISODate(now);
  const names = pickTodayDeadlineNames(rows, now);
  return {
    todayDeadlines: names.length,
    todayDeadlineNames: names,
    uncheckedRoutines: countUncheckedToday(blocks, checks, todayIso),
  };
}

export interface NotificationCopy {
  title: string;
  body: string;
}

// 마감 표기 규칙: D-1/D-3와 동일 패턴.
//   1건 → "<A> 마감"
//   2건 → "<A>, <B> 마감"
//   3건+ → "<A>, <B> 외 N개 마감"
function formatDeadlinePart(names: string[]): string | null {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} 마감`;
  if (names.length === 2) return `${names[0]}, ${names[1]} 마감`;
  return `${names[0]}, ${names[1]} 외 ${names.length - 2}개 마감`;
}

export function formatMorningMessage(
  summary: MorningSummaryCounts,
): NotificationCopy {
  const parts: string[] = [];
  const deadlinePart = formatDeadlinePart(summary.todayDeadlineNames);
  if (deadlinePart) parts.push(deadlinePart);
  if (summary.uncheckedRoutines > 0)
    parts.push(`미체크 루틴 ${summary.uncheckedRoutines}개`);
  return {
    title: '오늘의 하루',
    body: parts.length > 0 ? `${parts.join(' · ')} 남았어요.` : '',
  };
}
