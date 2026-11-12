'use client';

import { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { requestNotifPermission, useNotifPermission } from '../../lib/notif-permission';
import { BUTTON_PRIMARY } from '../jobs/cells/popover-style';

const DESC = {
  granted: '브라우저 알림이 허용돼 있어요.',
  default: '알림을 받으려면 브라우저 알림을 허용해주세요.',
  denied: '주소창 자물쇠 → 사이트 설정 → 알림에서 다시 열어주세요.',
  unsupported: '이 브라우저는 알림을 지원하지 않아요.',
} as const;

// 알림 설정 창 맨 위 권한 상자 — 창 안 다른 항목과 구분되게 thead 바탕.
// 허용 요청 뒤엔 변경 이벤트로 아래 항목들도 같이 잠금이 풀림(lib/notif-permission).
export function NotificationPermissionRow() {
  const state = useNotifPermission();
  const [requesting, setRequesting] = useState(false);

  async function request() {
    if (state !== 'default') return;
    setRequesting(true);
    await requestNotifPermission();
    setRequesting(false);
  }

  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-divider bg-thead px-4 py-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-ink-strong">브라우저 알림 권한</span>
        <span className="text-[13px] text-ink-soft">{state === null ? ' ' : DESC[state]}</span>
      </div>
      {state === 'default' ? (
        <button type="button" onClick={request} disabled={requesting} className={`${BUTTON_PRIMARY} shrink-0`}>
          {requesting ? '요청 중…' : '허용 요청'}
        </button>
      ) : state === 'granted' ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary">
          <Check className="h-4 w-4" aria-hidden />
          허용됨
        </span>
      ) : state === 'denied' ? (
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-warn">
          <Lock className="h-4 w-4" aria-hidden />
          차단됨
        </span>
      ) : state === 'unsupported' ? (
        <span className="shrink-0 text-sm text-ink-muted">미지원</span>
      ) : null}
    </div>
  );
}
