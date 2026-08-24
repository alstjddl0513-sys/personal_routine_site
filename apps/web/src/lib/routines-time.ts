// start_time / end_time stored as minutes-from-midnight (0..1410, step 30).
// 1410 = 23:30 (last valid slot).

export const TIME_STEP = 30;
export const TIME_MIN = 0;
export const TIME_MAX = 1410;
export const DEFAULT_START_TIME = 9 * 60; // 09:00

export function clampStep(min: number): number {
  const clamped = Math.max(TIME_MIN, Math.min(TIME_MAX, min));
  return Math.round(clamped / TIME_STEP) * TIME_STEP;
}

function fmt(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

// Legacy formatter for a single start time (used by streak/other places).
export function formatStartTime(min: number | null): string {
  if (min === null || min === undefined) return '—';
  return fmt(min);
}

// Format a start/end pair. Only start → "7:00", both → "8:30~11:30".
export function formatTimeRange(
  start: number | null,
  end: number | null,
): string {
  if (start === null) return '—';
  if (end === null) return fmt(start);
  return `${fmt(start)}~${fmt(end)}`;
}

// Parse a single "HH:MM" / "HHMM" / "HMM" / "HH" token to minutes.
// Returns null on unparseable/out-of-range.
function parseSingle(token: string): number | null {
  const t = token.trim();
  if (!t) return null;
  const withColon = /^(\d{1,2}):(\d{1,2})$/.exec(t);
  const digitsOnly = /^(\d{1,4})$/.exec(t);
  let h: number;
  let m: number;
  if (withColon) {
    h = Number(withColon[1]);
    m = Number(withColon[2]);
  } else if (digitsOnly) {
    const d = digitsOnly[1];
    if (d.length <= 2) {
      h = Number(d);
      m = 0;
    } else if (d.length === 3) {
      h = Number(d.slice(0, 1));
      m = Number(d.slice(1));
    } else {
      h = Number(d.slice(0, 2));
      m = Number(d.slice(2));
    }
  } else {
    return null;
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return clampStep(h * 60 + m);
}

export type ParsedRange =
  | { start: number | null; end: number | null }
  | 'invalid';

// Accepts:
//   ""                 → { start: null, end: null }  (unset)
//   "7:00" / "7" / "700" → { start: 420, end: null }
//   "8:30~11:30"       → { start, end }
//   "8:30-11:30"       → { start, end }  (dash also allowed)
// Rejects when end <= start, or any token fails to parse.
export function parseTimeRangeInput(raw: string): ParsedRange {
  const trimmed = raw.trim();
  if (!trimmed) return { start: null, end: null };

  const parts = trimmed.split(/\s*[~\-]\s*/);
  if (parts.length === 1) {
    const start = parseSingle(parts[0]);
    if (start === null) return 'invalid';
    return { start, end: null };
  }
  if (parts.length !== 2) return 'invalid';

  const start = parseSingle(parts[0]);
  const end = parseSingle(parts[1]);
  if (start === null || end === null) return 'invalid';
  if (end <= start) return 'invalid';
  return { start, end };
}
