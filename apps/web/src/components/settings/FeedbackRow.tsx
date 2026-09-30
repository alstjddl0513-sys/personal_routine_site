'use client';

import { useState } from 'react';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';

export function FeedbackRow() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <MessageSquare className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            피드백 보내기
          </div>
          <p className="mt-0.5 break-keep text-xs text-zinc-500 dark:text-zinc-400">
            버그·개선 아이디어를 짧게 남겨주시면 큰 도움이 돼요.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" aria-hidden />
      </button>
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
