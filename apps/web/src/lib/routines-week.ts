// Week utilities. Weeks start on Monday (ISO).
// All dates handled as local calendar dates in "YYYY-MM-DD" form to match the
// API's date columns (no time component). new Date(y, m, d) uses local time.

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Monday-of-week for a given date (local calendar).
export function mondayOf(d: Date): Date {
  const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const daysSinceMon = dow === 0 ? 6 : dow - 1;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - daysSinceMon);
}

export interface WeekInfo {
  monday: Date;
  days: Date[]; // 7 entries, Mon..Sun
  from: string; // Monday ISO date
  to: string;   // Sunday ISO date
}

export function weekOf(anchor: Date): WeekInfo {
  const mon = mondayOf(anchor);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i));
  }
  return {
    monday: mon,
    days,
    from: toISODate(days[0]),
    to: toISODate(days[6]),
  };
}

// Parse "YYYY-MM-DD" as local midnight. Never use new Date(iso) here — that
// treats the string as UTC and can drift by a day depending on tz.
export function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];

export function dowLabel(d: Date): string {
  return DOW_KO[d.getDay()];
}

export function formatWeekRange(week: WeekInfo): string {
  const m = week.monday;
  const s = week.days[6];
  const mm = String(m.getMonth() + 1).padStart(2, '0');
  const md = String(m.getDate()).padStart(2, '0');
  const sm = String(s.getMonth() + 1).padStart(2, '0');
  const sd = String(s.getDate()).padStart(2, '0');
  return `${m.getFullYear()}. ${mm}. ${md} ~ ${sm}. ${sd}`;
}

// --- month view (calendar) ---

export interface MonthInfo {
  year: number;
  month: number; // 1..12
  firstOfMonth: Date;
  /** 6×7 = 42 cells, starting from the Monday on/before the 1st. */
  gridDays: Date[];
  gridFrom: string;
  gridTo: string;
}

// Monday-start to stay consistent with the weekly view.
export function monthOf(anchor: Date): MonthInfo {
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const firstOfMonth = new Date(year, month - 1, 1);
  const gridStart = mondayOf(firstOfMonth);
  const gridDays: Date[] = [];
  for (let i = 0; i < 42; i++) gridDays.push(addDays(gridStart, i));
  return {
    year,
    month,
    firstOfMonth,
    gridDays,
    gridFrom: toISODate(gridDays[0]),
    gridTo: toISODate(gridDays[41]),
  };
}

export function parseISOMonth(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return null;
  return new Date(year, mon - 1, 1);
}

export function toISOMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
