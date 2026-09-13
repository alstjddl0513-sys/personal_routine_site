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

interface Props {
  questions: RandomQuestion[];
  initialIndex: number;
}

export function LearnCard({ questions, initialIndex }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Local shadow of `status` per question so answering updates the header
  // pill and completion state without a refetch. Seeded from server data.
  const [statuses, setStatuses] = useState<(QuestionStatus | null)[]>(() =>
    questions.map((q) => q.status),
  );
  // Cached full detail for the current question (fetched on "답 보기"). Reset
  // when the user navigates so the answer stays hidden by default.
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'right' | 'left'>('right');

  const question = questions[currentIndex];
  const currentStatus = statuses[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < questions.length - 1;
  const allAnswered = statuses.every((s) => s !== null);

  // Sync `?q=<current id>` to the URL bar so refresh keeps the same question.
  // history.replaceState avoids a Next navigation (would remount and wipe
  // state). Runs on every currentIndex change including initial mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('q') === question.id) return;
    url.searchParams.set('q', question.id);
    window.history.replaceState(null, '', url.toString());
  }, [question.id]);

  async function handleShowAnswer() {
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

  return (
    <div
      className="mx-auto mt-4 w-full max-w-3xl md:mt-10"
      style={{ perspective: '1200px' }}
    >
      <div
        key={question.id}
        className={`flex min-h-[500px] flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg md:p-12 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-zinc-900/40 ${
          direction === 'right'
            ? 'animate-card-flip-in-right'
            : 'animate-card-flip-in-left'
        }`}
      >
        {/* Header: '오늘의 질문 · N/10' 좌 / status pill + prev·next 화살표 우 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
              오늘의 질문
            </span>
            <span className="text-[11px] tabular-nums text-zinc-500 dark:text-zinc-500">
              {currentIndex + 1} / {questions.length}
            </span>
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
                aria-label="이전 질문"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext}
                aria-label="다음 질문"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* Celebration banner — appears once every question in today's set
            has a log. User can still browse via prev/next to revisit. */}
        {allAnswered ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
            <PartyPopper className="h-4 w-4" aria-hidden />
            <span>
              오늘 학습 완료! 내일 새로운 10문제로 만나요.
            </span>
          </div>
        ) : null}

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
              onClick={handleShowAnswer}
              disabled={loading}
              className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : null}
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
                onClick={() => handleStatus('understood')}
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
                onClick={() => handleStatus('review_needed')}
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
                onClick={() => setShowAnswer(false)}
                className="ml-1 inline-flex items-center rounded-md px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
              >
                접기
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>
    </div>
  );
}
