'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { SettingsRow } from './SettingsRow';
import { BUTTON_SECONDARY } from '../jobs/cells/popover-style';

// 설정 › 앱 › 피드백 — 줄 이름은 명사, 버튼은 동사. 줄 끝 테두리 버튼이 창을 엶
export function FeedbackRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsRow
        icon={MessageSquare}
        title="피드백"
        desc="버그·개선 아이디어를 짧게 남겨주시면 큰 도움이 돼요."
        end={
          <button type="button" onClick={() => setOpen(true)} aria-label="피드백 작성하기" className={BUTTON_SECONDARY}>
            작성하기
          </button>
        }
      />
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
