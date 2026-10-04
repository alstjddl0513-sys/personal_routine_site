import type { CompanyEvent } from '@repo/shared';
import { COMPANY_EVENT_TYPE_LABELS } from '@repo/shared';
import { todayInSeoul, toISODate } from './routines-week';

// 캘린더 이벤트(면접/시험/발표 등) D-3/D-1/당일 브라우저 알림 유틸.
// DeadlineNotifier 패턴 미러. localStorage로 하루 1회 가드(각 daysLeft별,
// event id 단위) + 사용자 on/off 토글.

const KEY_ENABLED = 'rally.notif.event.enabled';

function keyLastFired(daysLeft: number): string {
  return `rally.notif.event-d${daysLeft}.last-fired`;
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

export const CHANGE_EVENT_NAME = 'rally.notif.event-enabled-changed';
const CHANGE_EVENT = CHANGE_EVENT_NAME;

let applyingRemote = false;
export function isApplyingRemote(): boolean {
  return applyingRemote;
}

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

export function setEnabledSilent(enabled: boolean): void {
  const s = storage();
  if (!s) return;
  applyingRemote = true;
  try {
    s.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(CHANGE_EVENT));
    }
  } finally {
    applyingRemote = false;
  }
}

interface FiredMarker {
  date: string;
  ids: string[]; // event.id 단위
}

function readFiredMarker(daysLeft: number): FiredMarker | null {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(keyLastFired(daysLeft));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as { date?: unknown }).date === 'string' &&
      Array.isArray((parsed as { ids?: unknown }).ids)
    ) {
      return parsed as FiredMarker;
    }
  } catch {
    // fallthrough
  }
  return { date: raw, ids: [] };
}

export function getFiredIdsToday(daysLeft: number): Set<string> {
  const marker = readFiredMarker(daysLeft);
  if (!marker) return new Set();
  if (marker.date !== toISODate(todayInSeoul())) return new Set();
  return new Set(marker.ids);
}

export function addFiredIdsToday(daysLeft: number, ids: string[]): void {
  const s = storage();
  if (!s) return;
  const existing = getFiredIdsToday(daysLeft);
  for (const id of ids) existing.add(id);
  const marker: FiredMarker = {
    date: toISODate(todayInSeoul()),
    ids: [...existing],
  };
  s.setItem(keyLastFired(daysLeft), JSON.stringify(marker));
}

// 날짜 문자열(YYYY-MM-DD) 간 일수 차 (ev.date - today, 양수면 미래).
function daysBetween(fromIso: string, toIso: string): number | null {
  const fp = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fromIso);
  const tp = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toIso);
  if (!fp || !tp) return null;
  const f = new Date(Number(fp[1]), Number(fp[2]) - 1, Number(fp[3])).getTime();
  const t = new Date(Number(tp[1]), Number(tp[2]) - 1, Number(tp[3])).getTime();
  return Math.round((t - f) / 86_400_000);
}

export interface EventWithCompany extends CompanyEvent {
  companyName: string;
}

// daysLeft와 정확히 일치하는 이벤트만 pick (D-3/D-1/D-0).
export function pickEventsByDaysLeft(
  events: EventWithCompany[],
  daysLeft: number,
  todayIsoKst: string,
): EventWithCompany[] {
  return events.filter((e) => daysBetween(todayIsoKst, e.date) === daysLeft);
}

export interface NotificationCopy {
  title: string;
  body: string;
}

function whenLabel(daysLeft: number): string {
  if (daysLeft === 0) return '오늘';
  if (daysLeft === 1) return '내일';
  return `${daysLeft}일 뒤`;
}

// type별 액션 동사: "면접이 내일이에요" 같은 자연스러운 문장.
function typeActionLabel(type: CompanyEvent['type']): string {
  return COMPANY_EVENT_TYPE_LABELS[type];
}

export function formatEventMessage(
  items: EventWithCompany[],
  daysLeft: number,
): NotificationCopy {
  if (items.length === 0) return { title: '', body: '' };
  const when = whenLabel(daysLeft);
  if (items.length === 1) {
    const it = items[0];
    const action = typeActionLabel(it.type);
    const note = it.note ? ` (${it.note})` : '';
    return {
      title: `${when} ${action}`,
      body: `${it.companyName} ${action}${note}이 ${when}이에요.`,
    };
  }
  // 2개 이상 — 회사명 2개까지 나열, 그 이후 "외 N개".
  const names =
    items.length === 2
      ? `${items[0].companyName}, ${items[1].companyName}`
      : `${items[0].companyName} 외 ${items.length - 1}개`;
  return {
    title: `${when} 일정 ${items.length}건`,
    body: `${names}의 일정이 ${when}이에요.`,
  };
}
