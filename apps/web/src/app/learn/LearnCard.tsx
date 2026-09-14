'use client';

import { ChevronLeft, ChevronRight, Loader2, PartyPopper } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  QUESTION_STATUS_LABELS,
  type QuestionDetail,
  type QuestionStatus,
  type RandomQuestion,
} from '@repo/shared';
import { getQuestionDetail, logQuestion } from '../../lib/api';

export type LearnMode = 'daily' | 'review';

interface Props {
  questions: RandomQuestion[];
  initialIndex: number;
  /** 'daily'는 오늘 quota, 'review'는 복습필요 모아보기. 완료 카드 문구만 분기. */
  mode?: LearnMode;
}

// Positions: 0..questions.length-1 = normal question cards, questions.length
// = the "오늘 학습 완료" card. Prev from completion goes back to the last
// question; user can revisit anything via prev/next.
export function LearnCard({ questions, initialIndex, mode = 'daily' }: Props) {
  const total = questions.length;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Local shadow of `status` per question so answering updates the header
  // pill and summary without a refetch. Seeded from server data.
  const [statuses, setStatuses] = useState<(QuestionStatus | null)[]>(() =>
    questions.map((q) => q.status),
  );
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'right' | 'left'>('right');

  const onCompletion = currentIndex === total;
  const question = onCompletion ? null : questions[currentIndex];
  const currentStatus = onCompletion ? null : statuses[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total;

  // Sync ?q=<uuid> to URL for refresh-safe positioning. On the completion
  // card, drop the param so refresh → pickInitialIndex re-detects (all
  // answered → completion again; some unanswered → jump there).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (onCompletion) {
      if (url.searchParams.has('q')) {
        url.searchParams.delete('q');
        window.history.replaceState(null, '', url.toString());
      }
      return;
    }
    if (url.searchParams.get('q') === question!.id) return;
    url.searchParams.set('q', question!.id);
    window.history.replaceState(null, '', url.toString());
  }, [currentIndex, onCompletion, question]);

  async function handleShowAnswer() {
    if (!question) return;
    setError(null);
    if (!detail || detail.id !== question.id) {
      setLoading(true);
      try {
        const d = await getQuestionDetail(question.id);
        setDetail(d);
      } catch (e) {
        setError((e as Error).message);
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setShowAnswer(true);
  }

  async function handleStatus(status: QuestionStatus) {
    if (!question) return;
    setError(null);
    try {
      const log = await logQuestion(question.id, status);
      setDetail((d) => (d && d.id === question.id ? { ...d, log } : d));
      setStatuses((prev) => {
        const next = [...prev];
        next[currentIndex] = status;
        return next;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function goTo(nextIndex: number, dir: 'right' | 'left') {
    setError(null);
    setDirection(dir);
    setCurrentIndex(nextIndex);
    setDetail(null);
    setShowAnswer(false);
  }
  function handleNext() {
    if (canGoNext) goTo(currentIndex + 1, 'right');
  }
  function handlePrev() {
    if (canGoPrev) goTo(currentIndex - 1, 'left');
  }

  const cardKey = onCompletion ? 'completion' : question!.id;
  const cardAnim =
    direction === 'right' ? 'animate-card-flip-in-right' : 'animate-card-flip-in-left';

  return (
    <div
      className="mx-auto mt-4 w-full max-w-3xl md:mt-10"
      style={{ perspective: '1200px' }}
    >
      <div
        key={cardKey}
        className={`flex min-h-[500px] flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg md:p-12 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-zinc-900/40 ${cardAnim}`}
      >
        {/* Header: 좌측 라벨 + 우측 상태 pill/네비 화살표 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              {onCompletion ? '완료' : 'CS 질문'}
            </span>
            {onCompletion ? null : (
              <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500">
                {currentIndex + 1} / {total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentStatus ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  currentStatus === 'understood'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {QUESTION_STATUS_LABELS[currentStatus]}
              </span>
            ) : null}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrev}
                disabled={!canGoPrev}
                aria-label="이전"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                aria-label="다음"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {onCompletion ? (
          <CompletionBody
            mode={mode}
            total={total}
            understood={statuses.filter((s) => s === 'understood').length}
            reviewNeeded={statuses.filter((s) => s === 'review_needed').length}
          />
        ) : (
          <QuestionBody
            question={question!}
            currentStatus={currentStatus}
            detail={detail}
            showAnswer={showAnswer}
            loading={loading}
            onShowAnswer={handleShowAnswer}
            onCollapseAnswer={() => setShowAnswer(false)}
            onStatus={handleStatus}
          />
        )}

        {error ? (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}

function QuestionBody({
  question,
  currentStatus,
  detail,
  showAnswer,
  loading,
  onShowAnswer,
  onCollapseAnswer,
  onStatus,
}: {
  question: RandomQuestion;
  currentStatus: QuestionStatus | null;
  detail: QuestionDetail | null;
  showAnswer: boolean;
  loading: boolean;
  onShowAnswer: () => void;
  onCollapseAnswer: () => void;
  onStatus: (s: QuestionStatus) => void;
}) {
  return (
    <>
      {/* Q + [답 보기] as one left-aligned block, vertically centered */}
      <div className="flex flex-1 flex-col items-start justify-center gap-6 py-6">
        <p className="w-full text-xl leading-relaxed font-medium text-zinc-900 md:text-2xl dark:text-zinc-100">
          <span className="mr-2 font-semibold text-emerald-500 dark:text-emerald-400">
            Q.
          </span>
          {question.content}
        </p>
        {!showAnswer ? (
          <button
            type="button"
            onClick={onShowAnswer}
            disabled={loading}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            답 보기
          </button>
        ) : null}
      </div>

      {showAnswer ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              <span className="mr-2 font-semibold text-emerald-500 dark:text-emerald-400">
                A.
              </span>
              {detail?.answer}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onStatus('understood')}
              className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                currentStatus === 'understood'
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60'
              }`}
            >
              이해완료
            </button>
            <button
              type="button"
              onClick={() => onStatus('review_needed')}
              className={`inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                currentStatus === 'review_needed'
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-amber-500/40 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60'
              }`}
            >
              복습필요
            </button>
            <button
              type="button"
              onClick={onCollapseAnswer}
              className="ml-1 inline-flex items-center rounded-md px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            >
              접기
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CompletionBody({
  mode,
  total,
  understood,
  reviewNeeded,
}: {
  mode: LearnMode;
  total: number;
  understood: number;
  reviewNeeded: number;
}) {
  const skipped = total - understood - reviewNeeded;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
        <PartyPopper className="h-8 w-8" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-zinc-900 md:text-2xl dark:text-zinc-100">
          {mode === 'review' ? '복습 완료!' : '오늘의 학습 완료!'}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {mode === 'review'
            ? '수고했어요. ‘이해완료’로 넘어간 질문은 이 목록에서 빠져요.'
            : `내일 새로운 ${total}문제로 만나요.`}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
          이해완료 {understood}
        </span>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          복습필요 {reviewNeeded}
        </span>
        {skipped > 0 ? (
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            미체크 {skipped}
          </span>
        ) : null}
      </div>
    </div>
  );
}
