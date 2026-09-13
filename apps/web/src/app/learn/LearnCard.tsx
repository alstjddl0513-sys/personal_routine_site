'use client';

import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
  // Browsing history for the ← arrow. Pop pushes current to it; back pops.
  // Full RandomQuestion cached so we don't refetch (server random couldn't
  // reproduce the same id anyway).
  const [history, setHistory] = useState<RandomQuestion[]>([]);
  // Latest navigation direction — drives which keyframes fire on remount.
  const [direction, setDirection] = useState<'right' | 'left'>('right');

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
      setHistory((h) => [...h, question]);
      setDirection('right');
      setQuestion(next);
      setDetail(null);
      setShowAnswer(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handlePrev() {
    if (history.length === 0) return;
    setError(null);
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setDirection('left');
    setQuestion(prev);
    setDetail(null);
    setShowAnswer(false);
  }

  const canGoPrev = history.length > 0;

  return (
    // 3D perspective on the outer container so the inner rotateY reads as depth.
    // mt/py 여백으로 카드가 viewport 상하 중간 근처에 놓이게 (page header 아래).
    <div
      className="mx-auto mt-4 w-full max-w-3xl md:mt-10"
      style={{ perspective: '1200px' }}
    >
      <div
        // key remounts the card on question change → animation re-fires.
        key={question.id}
        className={`flex min-h-[500px] flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-lg md:p-12 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-zinc-900/40 ${
          direction === 'right'
            ? 'animate-card-flip-in-right'
            : 'animate-card-flip-in-left'
        }`}
      >
        {/* Header: '오늘의 질문' (좌) / status pill + prev·next 화살표 (우).
            좌우 카드 가장자리 대신 헤더에 나란히 두는 편이 웹·모바일 둘 다
            시선 이동이 적고 tap target도 안 겹침. */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            오늘의 질문
          </span>
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
                disabled={!canGoPrev || loading}
                aria-label="이전 질문"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-500 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                aria-label="다음 질문"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                {loading && !detail ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                ) : (
                  <ChevronRight className="h-5 w-5" aria-hidden />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Middle: Q + "답 보기" trigger as one left-aligned block, vertically
            centered so ← → arrows (in header, top-right) don't collide and
            the Q+CTA reads as a single unit. When answer opens, this block
            keeps just the Q; A. + status buttons flow below. */}
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

        {/* Answer + status buttons — only rendered when the user opens the
            answer. Sits below the middle block, card grows naturally. */}
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
