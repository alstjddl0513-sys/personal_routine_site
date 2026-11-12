'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS, type FeedbackCategory } from '@repo/shared';
import { submitFeedback } from '../../lib/api';
import { APP_VERSION } from '../../lib/version';
import { Segment } from '../ui/Segment';
import { SettingsDialog } from './SettingsDialog';
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from '../jobs/cells/popover-style';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BODY_MAX = 2000;
const DISABLED_PRIMARY =
  'inline-flex min-h-10 items-center justify-center rounded-md bg-divider px-4 text-sm font-semibold text-icon-faint';

// 설정 › 피드백 쓰기 창. 종류(세그먼트) + 내용만 입력, 페이지 · 버전 · 계정은 자동으로 붙음.
// 보내면 감사 문구를 1.5초 보여주고 닫힘. 열 때마다 처음부터(Body를 새로 그림).
export function FeedbackModal({ open, onClose }: Props) {
  if (!open) return null;
  return <FeedbackModalBody onClose={onClose} />;
}

function FeedbackModalBody({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(t);
  }, [done, onClose]);

  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= BODY_MAX && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({ category, body: trimmed, page: pathname ?? undefined, version: APP_VERSION });
      setDone(true);
    } catch (err) {
      console.error(err);
      setError('전송에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SettingsDialog open title="피드백 보내기" labelId="feedback-title" onClose={onClose} busy={submitting}>
      {done ? (
        <div role="status" className="flex flex-col items-center gap-1 py-8 text-center">
          <p className="font-semibold text-ink-strong">보내주셔서 감사합니다.</p>
          <p className="text-[13px] text-ink-muted">확인 후 반영할게요.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ink-soft">종류</span>
            <Segment
              label="피드백 종류"
              value={category}
              onChange={setCategory}
              options={FEEDBACK_CATEGORIES.map((c) => ({ value: c, label: FEEDBACK_CATEGORY_LABELS[c] }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="feedback-body" className="text-sm font-semibold text-ink-soft">
              내용
            </label>
            <textarea
              id="feedback-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
              placeholder="어떤 부분이 불편했는지, 어떤 게 있으면 좋을지 알려주세요."
              className="min-h-35 w-full resize-y rounded-md border border-btn-border bg-surface px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-chip-on-border"
            />
            <span className="flex justify-between gap-2 text-xs text-ink-faint">
              <span>지금 페이지 · 앱 버전 · 계정 정보는 자동으로 함께 전달돼요.</span>
              <span className="tabular-nums">
                {body.length} / {BODY_MAX}
              </span>
            </span>
          </div>
          {error ? (
            <p role="alert" className="text-[13px] text-alert">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={submitting} className={BUTTON_SECONDARY}>
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={canSubmit || submitting ? BUTTON_PRIMARY : DISABLED_PRIMARY}
            >
              {submitting ? '보내는 중…' : '보내기'}
            </button>
          </div>
        </>
      )}
    </SettingsDialog>
  );
}
