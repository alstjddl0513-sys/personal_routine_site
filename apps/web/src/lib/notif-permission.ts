'use client';

import { useSyncExternalStore } from 'react';

// 브라우저 알림 권한 — 알림 설정 창의 권한 줄과 항목 6개가 같이 씀.
// 브라우저 permission API엔 표준 change 이벤트가 없어서, 허용 요청 뒤 이 이벤트를 쏴서
// 모든 줄이 같이 다시 그려지게 함(전엔 줄마다 따로 읽어서 허용해도 항목이 안 바뀌었음).
export type NotifPermission = 'unsupported' | 'default' | 'granted' | 'denied';

export const PERMISSION_CHANGE_EVENT = 'rally.notif.permission-changed';

function read(): NotifPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  const p = Notification.permission;
  if (p === 'granted') return 'granted';
  if (p === 'denied') return 'denied';
  return 'default';
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(PERMISSION_CHANGE_EVENT, cb);
  return () => window.removeEventListener(PERMISSION_CHANGE_EVENT, cb);
}

/** 서버 렌더에선 null(자리만), hydration 뒤 실제 권한 */
export function useNotifPermission(): NotifPermission | null {
  return useSyncExternalStore<NotifPermission | null>(subscribe, read, () => null);
}

export async function requestNotifPermission(): Promise<void> {
  try {
    await Notification.requestPermission();
  } catch {
    // 일부 브라우저는 안전하지 않은 주소 등에서 throw — 권한은 그대로 두고 다시 그리기만
  } finally {
    window.dispatchEvent(new Event(PERMISSION_CHANGE_EVENT));
  }
}
