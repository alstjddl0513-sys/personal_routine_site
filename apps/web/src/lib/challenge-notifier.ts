import { todayInSeoul, toISODate } from './routines-week';

// 챌린지 완주 하이라이트. 서버에서 completed로 전환된 챌린지의 completedAt이
// 오늘(KST)이면 "🏆 완주!" 알림. localStorage marker로 하루 1회 가드.

const KEY_ENABLED = 'rally.notif.challenge-celebrate.enabled';
const KEY_LAST_FIRED = 'rally.notif.challenge-celebrate.last-fired';

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

export const CHANGE_EVENT_NAME = 'rally.notif.challenge-celebrate-changed';
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

// completedAt (ISO timestamp)이 KST 오늘인지.
export function isCompletedToday(completedAtIso: string | null): boolean {
  if (!completedAtIso) return false;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(completedAtIso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const iso = `${get('year')}-${get('month')}-${get('day')}`;
  return iso === toISODate(todayInSeoul());
}

interface FiredMarker {
  date: string;
  ids: string[];
}

function readMarker(): FiredMarker | null {
  const s = storage();
  if (!s) return null;
  const raw = s.getItem(KEY_LAST_FIRED);
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
    // ignore
  }
  return null;
}

export function getFiredIdsToday(): Set<string> {
  const marker = readMarker();
  if (!marker) return new Set();
  if (marker.date !== toISODate(todayInSeoul())) return new Set();
  return new Set(marker.ids);
}

export function addFiredIdsToday(ids: string[]): void {
  const s = storage();
  if (!s) return;
  const existing = getFiredIdsToday();
  for (const id of ids) existing.add(id);
  const marker: FiredMarker = {
    date: toISODate(todayInSeoul()),
    ids: [...existing],
  };
  s.setItem(KEY_LAST_FIRED, JSON.stringify(marker));
}

export interface NotificationCopy {
  title: string;
  body: string;
}

export function formatCompletionMessage(
  titles: string[],
): NotificationCopy {
  if (titles.length === 0) return { title: '', body: '' };
  if (titles.length === 1) {
    return {
      title: '🏆 챌린지 완주!',
      body: `"${titles[0]}" 챌린지를 끝까지 지켰어요. 축하해요!`,
    };
  }
  return {
    title: `🏆 챌린지 ${titles.length}개 완주!`,
    body: `${titles.map((t) => `"${t}"`).join(', ')} 완주했어요. 축하해요!`,
  };
}
