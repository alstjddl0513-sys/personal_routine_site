// 알림 마스터 스위치. 최상위 on/off 하나로 모든 알림(아침 요약, 채용 마감,
// 루틴 리마인더, 운동 스킵) 일괄 정지. individual `getEnabled()` 상태는
// 그대로 보존되어 마스터만 다시 켜면 원복.
//
// 사용 규칙: 각 notifier가 fire 로직 진입 전 `getMasterEnabled()`를 먼저
// 체크. false면 개별 enabled 무시하고 조용히 스킵.

const KEY_ENABLED = 'rally.notif.master.enabled';
const CHANGE_EVENT = 'rally.notif.master.enabled-changed';

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getMasterEnabled(): boolean {
  const s = storage();
  if (!s) return true;
  const v = s.getItem(KEY_ENABLED);
  if (v === null) return true;
  return v === 'true';
}

export function setMasterEnabled(enabled: boolean): void {
  const s = storage();
  if (!s) return;
  s.setItem(KEY_ENABLED, enabled ? 'true' : 'false');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function subscribeMasterEnabled(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
