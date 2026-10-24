'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { QuestionDetail, QuestionStatus, RandomQuestion } from '@repo/shared';
import { getQuestionDetail, logQuestion } from '../../lib/api';

// /today 상단 그린 카드. 오늘의 5문제를 한 장씩 — 답은 '답 확인하기' 때
// getQuestionDetail로 지연 로드(answer·tip). 기록은 /learn과 같은
// logQuestion이라 /learn·복습 탭에 그대로 반영.
export function LearnCard({
  questions,
  categoryLabels,
}: {
  questions: RandomQuestion[];
  categoryLabels: Record<string, string>;
}) {
  const total = questions.length;
  const [statuses, setStatuses] = useState<(QuestionStatus | null)[]>(() =>
    questions.map((q) => q.status),
  );
  // 첫 미응답부터. 다 풀었으면 완료 화면(index === total).
  const [index, setIndex] = useState(() => {
    const i = questions.findIndex((q) => !q.status);
    return i >= 0 ? i : total;
  });
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = statuses.filter(Boolean).length;
  const question = index < total ? questions[index] : null;
  const status = question ? statuses[index] : null;
  const categoryLabel = question?.categoryKey
    ? categoryLabels[question.categoryKey]
    : undefined;

  async function reveal() {
    if (!question) return;
    setError(null);
    if (!detail || detail.id !== question.id) {
      setLoading(true);
      try {
        setDetail(await getQuestionDetail(question.id));
      } catch {
        setError('답을 불러오지 못했어요. 다시 눌러보세요.');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setShowAnswer(true);
  }

  async function mark(next: QuestionStatus) {
    if (!question) return;
    const prev = statuses[index];
    const at = index;
    setError(null);
    setStatuses((s) => s.map((v, i) => (i === at ? next : v)));
    try {
      await logQuestion(question.id, next);
    } catch {
      setStatuses((s) => s.map((v, i) => (i === at ? prev : v)));
      setError('기록하지 못했어요. 다시 눌러보세요.');
    }
  }

  // 다음 미응답으로. 뒤쪽에 없으면 앞쪽, 그래도 없으면 완료 화면.
  function goNext() {
    const after = statuses.findIndex((s, i) => i > index && !s);
    const before = statuses.findIndex((s) => !s);
    const next = after >= 0 ? after : before >= 0 && before !== index ? before : total;
    setIndex(next);
    setDetail(null);
    setShowAnswer(false);
    setError(null);
  }

  return (
    <section
      aria-labelledby="learn-title"
      className="flex min-w-0 flex-[3_1_560px] flex-col gap-4.5 rounded-[22px] border border-court-border bg-court p-6 text-white md:p-7.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 id="learn-title" className="text-[13px] font-bold tracking-[0.08em] text-lime">
            오늘의 학습
          </h2>
          {categoryLabel ? (
            <span className="rounded-full bg-court-soft px-2.75 py-0.75 text-[13px] text-on-court">
              {categoryLabel}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2.5 text-[13px] text-on-court-muted">
          <span className="flex gap-1.25" aria-hidden>
            {statuses.map((s, i) => (
              <span
                key={questions[i].id}
                className={`h-1.5 w-5.5 rounded-[3px] ${
                  s ? 'bg-lime' : i === index ? 'bg-white' : 'bg-court-dot'
                }`}
              />
            ))}
          </span>
          <span>
            <span className="font-display font-extrabold text-white">{done}</span> / {total}
          </span>
        </div>
      </div>

      {question ? (
        <>
          <p className="text-[22px] leading-[1.35] font-bold tracking-[-0.02em] md:text-[30px]">
            {question.content}
          </p>

          {showAnswer && detail ? (
            <div className="flex flex-col gap-3.5">
              <div className="rounded-[14px] bg-court-deep px-5 py-4.5 leading-[1.75] whitespace-pre-wrap text-on-court">
                {detail.answer}
              </div>
              {detail.tip ? (
                <div className="flex flex-col gap-1.5 px-1">
                  <span className="text-xs font-bold tracking-[0.06em] text-on-court-faint">
                    꼬리 질문
                  </span>
                  <p className="text-sm whitespace-pre-wrap text-on-court">{detail.tip}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-lime">
              {error}
            </p>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-2.5">
            {showAnswer ? (
              <>
                <MarkButton pressed={status === 'understood'} onClick={() => mark('understood')}>
                  이해함
                </MarkButton>
                <MarkButton
                  pressed={status === 'review_needed'}
                  onClick={() => mark('review_needed')}
                >
                  복습 필요
                </MarkButton>
              </>
            ) : (
              <button
                type="button"
                onClick={reveal}
                disabled={loading}
                className="min-h-12 rounded-full bg-lime px-6.5 text-[15px] font-bold text-court disabled:opacity-60"
              >
                {loading ? '불러오는 중…' : '답 확인하기'}
              </button>
            )}
            {total > 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="ml-auto inline-flex min-h-11 items-center text-sm text-on-court-muted hover:text-white"
              >
                다음 문제 →
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="text-[22px] leading-[1.35] font-bold md:text-[26px]">
            오늘 {total}문제를 다 풀었어요 🎉
          </p>
          <p className="text-[15px] text-on-court-muted">
            헷갈렸던 문제는 복습 탭에서 다시 학습해보세요.
          </p>
          <Link
            href="/learn/review"
            className="mt-auto inline-flex min-h-12 w-fit items-center rounded-full bg-lime px-6.5 text-[15px] font-bold text-court"
          >
            복습하러 가기
          </Link>
        </>
      )}
    </section>
  );
}

function MarkButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`min-h-12 rounded-full px-6 text-[15px] font-bold ${
        pressed
          ? 'bg-lime text-court'
          : 'border border-court-line bg-transparent text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  );
}
