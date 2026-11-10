import type { ReactNode } from 'react';

// 학습·복습 빈 상태 — 흰 카드, 가운데 한 줄 + 행동 하나(질문 카드와 같은 폭)
export function LearnEmpty({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="flex w-full max-w-200 flex-col items-center gap-2 rounded-lg border border-line bg-surface px-6 py-10 text-center">
      <p className="text-ink-soft">{message}</p>
      {children}
    </div>
  );
}
