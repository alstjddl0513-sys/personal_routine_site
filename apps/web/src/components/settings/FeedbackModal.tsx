'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, X } from 'lucide-react';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  type FeedbackCategory,
} from '@repo/shared';
import { submitFeedback } from '../../lib/api';
import { APP_VERSION } from '../../lib/version';
import { Portal } from '../ui/Portal';
import { Select, type SelectOption } from '../ui/Select';

interface Props {
  open: boolean;
  onClose: () => void;
}

const BODY_MAX = 2000;

const CATEGORY_OPTIONS: SelectOption[] = FEEDBACK_CATEGORIES.map((c) => ({
  value: c,
  label: FEEDBACK_CATEGORY_LABELS[c],
}));

// /settings 진입점(FeedbackRow)에서 열리는 인앱 피드백 폼.
// 유저는 카테고리 + 자유 텍스트만 입력. path/version/user_id는 자동 첨부.
// 성공 시 인라인 감사 메시지 후 자동 닫힘.
export function FeedbackModal({ open, onClose }: Props) {
  const pathname = usePathname();
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 모달 열릴 때 초기화. Esc + body scroll lock은 NotifSettingsModal 패턴 미러.
  useEffect(() => {
    if (!open) return;
    setCategory('suggestion');
    setBody('');
    setError(null);
    setDone(false);
    setSubmitting(false);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // 성공 후 1.5초 뒤 자동 닫힘.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => onClose(), 1500);
    return () => clearTimeout(t);
  }, [done, onClose]);

  if (!open) return null;

  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= BODY_MAX && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback({
        category,
        body: trimmed,
        page: pathname ?? undefined,
        version: APP_VERSION,
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      setError('전송에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Portal>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-4"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-lg pb-[env(safe-area-inset-bottom)] md:max-h-[calc(100vh-2rem)] md:max-w-lg md:rounded-lg md:pb-0 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-zinc-300 md:hidden dark:bg-zinc-700"
          />
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-zinc-500" aria-hidden />
              <h2
                id="feedback-title"
                className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
              >
                피드백 보내기
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          {done ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                보내주셔서 감사합니다.
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                확인 후 반영할게요.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  종류
                </label>
                <Select
                  value={category}
                  onChange={(v) => setCategory(v as FeedbackCategory)}
                  options={CATEGORY_OPTIONS}
                  ariaLabel="피드백 종류"
                  triggerClassName="w-fit min-w-32 cursor-pointer rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="feedback-body"
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  내용
                </label>
                <textarea
                  id="feedback-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, BODY_MAX))}
                  rows={6}
                  placeholder="어떤 부분이 불편했는지, 어떤 게 있으면 좋을지 알려주세요."
                  className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-600 dark:focus:border-zinc-600"
                />
                <div className="flex justify-end text-[11px] text-zinc-400 dark:text-zinc-600">
                  {body.length} / {BODY_MAX}
                </div>
              </div>

              <p className="text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
                지금 페이지 · 앱 버전 · 계정 정보는 자동으로 함께 전달돼요.
              </p>

              {error ? (
                <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {submitting ? '보내는 중…' : '보내기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
