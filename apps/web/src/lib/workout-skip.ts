import type { WorkoutHeatmapEntry } from '@repo/shared';
import { toISODate } from './routines-week';

// 운동 스킵 리마인더 유틸. morning-summary 패턴 미러. localStorage 키/이벤트
// 도메인은 `workout-skip.*`로 분리.
//
// 알림 시각은 고정. 사용자 커스텀 대신 저녁 시간으로 통일해 UI를 심플하게.
// skipDays는 개인의 운동 빈도 성향에 따라 다르므로 유지.

export const NOTIF_HOUR = 22;
export const DEFAULT_SKIP_DAYS = 3;
export const AVAILABLE_SKIP_DAYS = [3, 5, 7, 14] as const;

const KEY_ENABLED = 'rally.notif.workout-skip.enabled';
const KEY_SKIP_DAYS = 'rally.notif.workout-skip.skip-days';
const KEY_LAST_FIRED = 'rally.notif.workout-skip.last-fired';
const ENABLED_CHANGE_EVENT = 'rally.notif.workout-skip.enabled-changed';
const SKIP_DAYS_CHANGE_EVENT = 'rally.notif.workout-skip.skip-days-changed';

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

export function getSkipDays(): number {
  const s = storage();
  if (!s) return DEFAULT_SKIP_DAYS;
  const raw = s.getItem(KEY_SKIP_DAYS);
  if (raw === null) return DEFAULT_SKIP_DAYS;
  const n = Number(raw);
  return (AVAILABLE_SKIP_DAYS as readonly number[]).includes(n)
    ? n
    : DEFAULT_SKIP_DAYS;
}

export function setSkipDays(d: number): void {
  const s = storage();
  if (!s) return;
  if (!(AVAILABLE_SKIP_DAYS as readonly number[]).includes(d)) return;
  s.setItem(KEY_SKIP_DAYS, String(d));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SKIP_DAYS_CHANGE_EVENT));
  }
}

export function subscribeSkipDays(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SKIP_DAYS_CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(SKIP_DAYS_CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

// 로컬 시각 기준 오늘 ISO. routine-reminder / morning-summary와 동일.
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

// heatmap은 이미 "완전 세트(weightKg + reps 둘 다 기록됨)가 있는 운동 종목"만
// 카운트한다 (workout-sets.service의 heatmap 로직 참고). 따라서 여기선 그대로
// count > 0인 최근 날짜를 찾으면 됨.
//
// 반환값: 오늘로부터 며칠이 지났는지. today가 운동한 날이면 0.
// heatmap 범위 안에 완전 세트가 하나도 없으면 null — 임계값 초과로 취급.
export function computeDaysSinceLastWorkout(
  heatmap: WorkoutHeatmapEntry[],
  today: Date = new Date(),
): number | null {
  const activeDates = heatmap
    .filter((e) => e.completedExerciseCount > 0)
    .map((e) => e.date)
    .sort();
  const last = activeDates.at(-1);
  if (!last) return null;

  // 로컬 자정 기준 diff. YYYY-MM-DD 문자열이라 시각 정보가 없고, Date 생성 시
  // UTC로 파싱될 수 있어 명시적으로 로컬 자정 Date를 만든다.
  const [ly, lm, ld] = last.split('-').map(Number);
  const lastMidnight = new Date(ly, lm - 1, ld).getTime();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const diffMs = todayMidnight - lastMidnight;
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

export interface NotificationCopy {
  title: string;
  body: string;
}

export function formatWorkoutSkipMessage(
  daysSince: number | null,
): NotificationCopy {
  if (daysSince === null) {
    return {
      title: '운동 리마인더',
      body: '한동안 기록이 없어요. 가볍게 다시 시작해봐요.',
    };
  }
  return {
    title: '운동 리마인더',
    body: `${daysSince}일째 기록이 없어요. 오늘 짧게라도 어때요?`,
  };
}
