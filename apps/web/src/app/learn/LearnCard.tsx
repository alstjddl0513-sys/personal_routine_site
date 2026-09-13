'use client';

import { ChevronRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  QUESTION_STATUS_LABELS,
  type QuestionDetail,
  type QuestionStatus,
  type RandomQuestion,
} from '@repo/shared';
import {
  getQuestionDetail,
  getRandomQuestion,
  logQuestion,
} from '../../lib/api';

interface Props {
  initial: RandomQuestion;
}

export function LearnCard({ initial }: Props) {
  const [question, setQuestion] = useState<RandomQuestion>(initial);
  // Cached full detail for the current question (fetched on "답 보기"). Reset
  // whenever we navigate to a new question so answer stays hidden by default.
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current status prefers freshly-fetched detail.log, falls back to what the
  // random endpoint bundled with the question.
  const currentStatus: QuestionStatus | null =
    detail?.log?.status ?? question.status;

  async function handleShowAnswer() {
    setError(null);
    if (!detail) {
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
      setDetail((d) => (d ? { ...d, log } : d));
      setQuestion((q) => ({ ...q, status }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleNext() {
    setError(null);
    setLoading(true);
    try {
      const next = await getRandomQuestion({ exclude: question.id });
      setQuestion(next);
      setDetail(null);
      setShowAnswer(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group relative flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      {/* Prior status hint */}
      {currentStatus ? (
        <div className="text-[11px] text-zinc-500 dark:text-zinc-500">
          이전 답변:{' '}
          <span
            className={
              currentStatus === 'understood'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }
          >
            {QUESTION_STATUS_LABELS[currentStatus]}
          </span>
        </div>
      ) : null}

      <p className="text-lg font-medium leading-relaxed text-zinc-900 dark:text-zinc-100">
        {question.content}
      </p>

      {!showAnswer ? (
        <button
          type="button"
          onClick={handleShowAnswer}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-md border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : null}
          답 보기
        </button>
      ) : (
        <>
          <div className="whitespace-pre-wrap rounded-md border border-zinc-100 bg-zinc-50 p-4 text-sm leading-relaxed text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {detail?.answer}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleStatus('understood')}
              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
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
              className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                currentStatus === 'review_needed'
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-amber-500/40 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60'
              }`}
            >
              다시봐야함
            </button>
            <button
              type="button"
              onClick={() => setShowAnswer(false)}
              className="ml-1 inline-flex items-center rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-900 dark:hover:text-zinc-200"
            >
              접기
            </button>
          </div>
        </>
      )}

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {/* Next arrow. Always faded on mobile (tap target); desktop shows on
          hover only so a static card doesn't feel busy. min-h-11 keeps it a
          44px touch target (a11y). */}
      <button
        type="button"
        onClick={handleNext}
        disabled={loading}
        aria-label="다음 질문"
        className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 opacity-60 transition-opacity hover:text-zinc-800 hover:opacity-100 disabled:opacity-30 dark:text-zinc-500 dark:hover:text-zinc-200 md:opacity-0 md:group-hover:opacity-100"
      >
        {loading && !detail ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        ) : (
          <ChevronRight className="h-5 w-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
