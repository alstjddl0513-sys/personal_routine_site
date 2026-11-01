'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { QuestionStatus, RandomQuestion } from '@repo/shared';
import { CardLink, TodayPanel } from './Card';

const STATUS_LABEL: Record<QuestionStatus, string> = {
  understood: '이해함으로 기록했어요',
  review_needed: '복습 필요로 기록했어요',
};

// /today 오른쪽 열 '오늘의 학습'. 오늘의 5문제를 ‹ ›로 훑어보기만 하고,
// 답은 /learn에서 — '답 보러 가기'가 ?q=로 그 문제를 바로 연다.
export function LearnCard({
  questions,
  categoryLabels,
}: {
  questions: RandomQuestion[];
  categoryLabels: Record<string, string>;
}) {
  const total = questions.length;
  // 첫 미응답부터. 다 풀었으면 첫 문제.
  const [index, setIndex] = useState(() =>
    Math.max(0, questions.findIndex((q) => !q.status)),
  );
  const question = questions[index];
  const categoryLabel = question.categoryKey
    ? categoryLabels[question.categoryKey]
    : undefined;

  return (
    <TodayPanel
      id="learn-title"
      title="오늘의 학습"
      last
      aside={
        <span className="text-sm text-ink-muted">
          {index + 1} / {total}
          {categoryLabel ? ` · ${categoryLabel}` : ''}
        </span>
      }
    >
      {/* 5문제를 한 칸에 겹쳐 그리고 지금 문제만 보임 → 높이가 가장 긴 문제에
          고정돼서 넘겨도 아래 블로그 섹션이 오르내리지 않음. */}
      <div className="grid">
        {questions.map((q, i) => (
          <div
            key={q.id}
            aria-hidden={i !== index}
            className={`col-start-1 row-start-1 flex flex-col gap-2 ${i === index ? '' : 'invisible'}`}
          >
            <p className="text-lg leading-[1.45] font-semibold">{q.content}</p>
            {q.status ? (
              <span className="text-[13px] text-ink-muted">{STATUS_LABEL[q.status]}</span>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {total > 1 ? (
          <span className="flex gap-1">
            <ArrowButton
              label="이전 문제"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </ArrowButton>
            <ArrowButton
              label="다음 문제"
              disabled={index === total - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </ArrowButton>
          </span>
        ) : null}
        <Link
          href={`/learn?q=${question.id}`}
          className="ml-auto inline-flex min-h-10 items-center rounded-md border border-button bg-button px-4 text-sm font-semibold text-white hover:opacity-90"
        >
          답 보러 가기
        </Link>
      </div>
    </TodayPanel>
  );
}

// 문제가 없거나 못 불러왔을 때도 같은 섹션 틀 유지 (레이아웃 점프 방지).
export function LearnEmpty({ message }: { message: string }) {
  return (
    <TodayPanel
      id="learn-title"
      title="오늘의 학습"
      last
      aside={<CardLink href="/learn">학습으로 이동</CardLink>}
    >
      <p className="text-sm text-ink-muted">{message}</p>
    </TodayPanel>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-btn-border bg-btn-bg text-btn-fg hover:border-heading disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-btn-border"
    >
      {children}
    </button>
  );
}
