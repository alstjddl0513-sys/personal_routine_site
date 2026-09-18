// 알림 마스터 스위치. 최상위 on/off 하나로 모든 알림(아침 요약, 채용 마감,
// 루틴 리마인더, 운동 스킵) 일괄 정지. individual `getEnabled()` 상태는
// 그대로 보존되어 마스터만 다시 켜면 원복.
//
// 사용 규칙: 각 notifier가 fire 로직 진입 전 `getMasterEnabled()`를 먼저
// 체크. false면 개별 enabled 무시하고 조용히 스킵.

const KEY_ENABLED = 'rally.notif.master.enabled';
export const CHANGE_EVENT_NAME = 'rally.notif.master.enabled-changed';
const CHANGE_EVENT = CHANGE_EVENT_NAME;

// 서버 preferences → 로컬 반영 중임을 표시. PreferencesSyncClient가 자기 자신이
// dispatch한 이벤트를 소비해 upload PATCH를 재발사하는 루프를 막기 위한 플래그.
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

// 서버 값을 로컬에 반영할 때 사용. UI가 즉시 갱신되도록 이벤트는 발화하되,
// `applyingRemote` 플래그로 감싸 SyncClient의 upload 트리거가 no-op이 되게 함.
export function setMasterEnabledSilent(enabled: boolean): void {
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

export function subscribeMasterEnabled(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}
