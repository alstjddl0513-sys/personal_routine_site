'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { NotifSettingsModal } from './NotifSettingsModal';
import { SettingsRow } from './SettingsRow';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';

// 설정 › 앱 › 알림 설정 — 줄 끝 테두리 버튼이 창을 엶(창 안에서 바꾸면 바로 저장)
export function NotifSettingsRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsRow
        icon={Bell}
        title="알림 설정"
        desc="아침 요약 · 채용 마감 · 루틴 · 운동 알림을 한번에 관리해요."
        end={
          <button type="button" onClick={() => setOpen(true)} aria-label="알림 설정 열기" className={BUTTON_SECONDARY}>
            열기
          </button>
        }
      />
      <NotifSettingsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
