// 브라우저 알림 발송 이력 sink. new Notification() 성공 직후 각 컴포넌트에서
// logNotification()을 호출해 이 스택에 push. 사용자는 종 아이콘 → 드로어에서
// 최근 이력을 다시 볼 수 있음.
//
// 스토리지 전용(서버 X). 다인화 초기라 오버킬 방지. 나중에 필요하면
// profiles.preferences처럼 서버로 이관.

export type NotifType =
  | 'deadline-d1'
  | 'deadline-d3'
  | 'morning-summary'
  | 'routine-reminder'
  | 'workout-skip';

export interface NotifLogEntry {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  firedAt: number;
  href: string;
}

const KEY_LOG = 'rally.notif.log';
const KEY_LAST_READ = 'rally.notif.log.last-read-at';
const LOG_CHANGE_EVENT = 'rally.notif.log.changed';
const MAX_ENTRIES = 30;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function emitChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(LOG_CHANGE_EVENT));
}

// getSnapshot must return a stable reference — cache the parsed array by
// raw string so unchanged localStorage returns the same reference across
// renders (useSyncExternalStore invariant).
const EMPTY_LOG: readonly NotifLogEntry[] = Object.freeze([]);
let cachedRaw: string | null | undefined;
let cachedSnapshot: readonly NotifLogEntry[] = EMPTY_LOG;

export function getLog(): readonly NotifLogEntry[] {
  const s = storage();
  if (!s) return EMPTY_LOG;
  const raw = s.getItem(KEY_LOG);
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = EMPTY_LOG;
    return cachedSnapshot;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedSnapshot = EMPTY_LOG;
      return cachedSnapshot;
    }
    cachedSnapshot = parsed as NotifLogEntry[];
    return cachedSnapshot;
  } catch {
    cachedSnapshot = EMPTY_LOG;
    return cachedSnapshot;
  }
}

export function logNotification(
  entry: Omit<NotifLogEntry, 'id' | 'firedAt'> & { firedAt?: number },
): void {
  const s = storage();
  if (!s) return;
  const record: NotifLogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    firedAt: entry.firedAt ?? Date.now(),
    type: entry.type,
    title: entry.title,
    body: entry.body,
    href: entry.href,
  };
  const current = getLog();
  // 최신 항목이 앞으로 오는 스택. MAX 초과분은 뒤에서 절단.
  const next = [record, ...current].slice(0, MAX_ENTRIES);
  try {
    s.setItem(KEY_LOG, JSON.stringify(next));
  } catch {
    return;
  }
  cachedRaw = undefined;
  emitChange();
}

export function clearLog(): void {
  const s = storage();
  if (!s) return;
  s.removeItem(KEY_LOG);
  cachedRaw = undefined;
  cachedSnapshot = EMPTY_LOG;
  emitChange();
}

export function removeLogEntry(id: string): void {
  const s = storage();
  if (!s) return;
  const current = getLog();
  const next = current.filter((e) => e.id !== id);
  if (next.length === current.length) return;
  try {
    s.setItem(KEY_LOG, JSON.stringify(next));
  } catch {
    return;
  }
  cachedRaw = undefined;
  emitChange();
}

export function subscribeLog(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(LOG_CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(LOG_CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

export function markAllRead(): void {
  const s = storage();
  if (!s) return;
  s.setItem(KEY_LAST_READ, String(Date.now()));
  emitChange();
}

function getLastReadAt(): number {
  const s = storage();
  if (!s) return 0;
  const raw = s.getItem(KEY_LAST_READ);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function getUnreadCount(): number {
  const log = getLog();
  if (log.length === 0) return 0;
  const lastRead = getLastReadAt();
  let n = 0;
  for (const e of log) {
    if (e.firedAt > lastRead) n += 1;
  }
  return n;
}

export function getServerSnapshot(): readonly NotifLogEntry[] {
  return EMPTY_LOG;
}
