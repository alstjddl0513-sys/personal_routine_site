// Streak calculations for routines (daily) and workouts (weekly).
// Pure functions — take pre-fetched dates and return counts. Callers decide
// the lookback window (typically ~180 days).

import { addDays, mondayOf, toISODate } from './routines-week';

// A day "counts" when it appears in successDays. For routines, that means
// at least one time-block was checked on that date.
export function calcDailyStreak(successDays: Set<string>, today: Date): number {
  let cursor = today;
  // Today may not be done yet; if it isn't a success, start from yesterday
  // so an unfinished current day doesn't reset the streak mid-morning.
  if (!successDays.has(toISODate(cursor))) {
    cursor = addDays(cursor, -1);
  }
  let count = 0;
  while (successDays.has(toISODate(cursor))) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function calcBestDailyStreak(
  successDays: Set<string>,
  from: Date,
  to: Date,
): number {
  let best = 0;
  let cur = 0;
  let cursor = from;
  const toIso = toISODate(to);
  while (toISODate(cursor) <= toIso) {
    if (successDays.has(toISODate(cursor))) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
    cursor = addDays(cursor, 1);
  }
  return best;
}

// Group session dates by ISO Monday of their week, return count-per-week map.
function bucketByWeek(dates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const d of dates) {
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (!parts) continue;
    const parsed = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
    const key = toISODate(mondayOf(parsed));
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

// A week "counts" when it has >= threshold sessions. If the current week hasn't
// hit threshold yet, skip it (still in progress) and start from last week.
export function calcWeeklyStreak(
  sessionDates: string[],
  threshold: number,
  today: Date,
): number {
  const counts = bucketByWeek(sessionDates);
  let cursor = mondayOf(today);
  if ((counts.get(toISODate(cursor)) ?? 0) < threshold) {
    cursor = addDays(cursor, -7);
  }
  let count = 0;
  while ((counts.get(toISODate(cursor)) ?? 0) >= threshold) {
    count++;
    cursor = addDays(cursor, -7);
  }
  return count;
}

export function calcBestWeeklyStreak(
  sessionDates: string[],
  threshold: number,
  windowStartMon: Date,
  windowEndMon: Date,
): number {
  const counts = bucketByWeek(sessionDates);
  let best = 0;
  let cur = 0;
  let cursor = mondayOf(windowStartMon);
  const endIso = toISODate(mondayOf(windowEndMon));
  while (toISODate(cursor) <= endIso) {
    if ((counts.get(toISODate(cursor)) ?? 0) >= threshold) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
    cursor = addDays(cursor, 7);
  }
  return best;
}
