'use client';

import { useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { NotifSettingsModal } from './NotifSettingsModal';

// 설정 페이지 알림 섹션의 유일한 진입점. 클릭 시 모달을 열어 세부
// 토글(권한/아침 요약/채용 마감/루틴 리마인더/운동 스킵)을 한꺼번에 보여줌.
export function NotifSettingsRow() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <Bell className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            알림
          </div>
          <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
            아침 요약 · 채용 마감 · 루틴 · 운동 스킵을 한번에 관리해요.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      </button>
      <NotifSettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
