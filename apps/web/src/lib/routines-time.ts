// start_time is stored as minutes-from-midnight (0..1410, step 30).
// 1410 = 23:30 (last valid slot).

export const TIME_STEP = 30;
export const TIME_MIN = 0;
export const TIME_MAX = 1410;
export const DEFAULT_START_TIME = 9 * 60; // 09:00

export function clampStep(min: number): number {
  const clamped = Math.max(TIME_MIN, Math.min(TIME_MAX, min));
  return Math.round(clamped / TIME_STEP) * TIME_STEP;
}

// Always HH:MM (no AM/PM, no "시"). Example: 10:00, 18:30.
export function formatStartTime(min: number | null): string {
  if (min === null || min === undefined) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}
