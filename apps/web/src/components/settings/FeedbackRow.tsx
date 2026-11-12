'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { SettingsRow } from './SettingsRow';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';

// 설정 › 앱 › 피드백 보내기 — 줄 끝 테두리 버튼이 창을 엶
export function FeedbackRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsRow
        icon={MessageSquare}
        title="피드백 보내기"
        desc="버그·개선 아이디어를 짧게 남겨주시면 큰 도움이 돼요."
        end={
          <button type="button" onClick={() => setOpen(true)} className={BUTTON_SECONDARY}>
            피드백 쓰기
          </button>
        }
      />
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
