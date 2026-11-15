'use client';

import { Check, ChevronLeft, ChevronRight, Loader2, RotateCw, Star } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { QuestionDetail, QuestionStatus, RandomQuestion } from '@repo/shared';
import { getQuestionDetail, logQuestion, setQuestionFavorite } from '../../lib/api';
import { BUTTON_PRIMARY, BUTTON_TEXT } from '../jobs/cells/popover-style';

export type LearnMode = 'daily' | 'review' | 'favorites';

interface Props {
  questions: RandomQuestion[];
  initialIndex: number;
  /** 'daily' 오늘 5문제 · 'review' 복습필요 · 'favorites' 별표. 위 줄·완료 카드만 다름 */
  mode?: LearnMode;
  /** categoryKey → 이름. 위 줄 라벨(없거나 지운 카테고리면 "질문") */
  categoryNames?: Record<string, string>;
}

const STATUS_LABEL: Record<QuestionStatus, string> = {
  understood: '이해완료',
  review_needed: '복습필요',
};

// 입력 중이면 단축키 무시
function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName);
}

// 'YYYY-MM-DD' → '11월 2일'
const monthDay = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`;

// 오늘의 학습·복습 공용 질문 카드. 위치 0..total-1 = 질문, total = 완료 카드.
// 동작(답 불러오기·표시 저장·별표·?q= 위치·단축키)은 예전 LearnCard 그대로, 모양만 시안대로.
export function QuestionCard({ questions, initialIndex, mode = 'daily', categoryNames = {} }: Props) {
  const total = questions.length;
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // 표시·별표는 로컬 shadow로 바로 반영(서버값으로 시작)
  const [statuses, setStatuses] = useState<(QuestionStatus | null)[]>(() =>
    questions.map((q) => q.status),
  );
  const [favorites, setFavorites] = useState<boolean[]>(() => questions.map((q) => q.isFavorite));
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(false);
  // 오류 줄 + [다시 시도] — 실패한 동작을 그대로 다시
  const [error, setError] = useState<{ message: string; retry: () => void } | null>(null);
  const [direction, setDirection] = useState<'right' | 'left'>('right');

  const onCompletion = currentIndex === total;
  const question = onCompletion ? null : questions[currentIndex];
  const currentStatus = onCompletion ? null : statuses[currentIndex];
  const currentFavorite = onCompletion ? false : favorites[currentIndex];
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < total;

  // ?q=<uuid>를 주소에 맞춰 새로고침해도 같은 질문. 완료 카드에선 지움.
  useEffect(() => {
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
        setDetail(await getQuestionDetail(question.id));
      } catch (e) {
        console.error(e);
        setError({ message: '답을 불러오지 못했어요. 잠시 후 다시 해보세요.', retry: () => void handleShowAnswer() });
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setShowAnswer(true);
  }

  // 별표 — optimistic, 실패하면 되돌림
  async function handleToggleFavorite() {
    if (!question) return;
    setError(null);
    const idx = currentIndex;
    const next = !favorites[idx];
    const setAt = (v: boolean) =>
      setFavorites((prev) => {
        const arr = [...prev];
        arr[idx] = v;
        return arr;
      });
    setAt(next);
    setDetail((d) => (d && d.id === question.id ? { ...d, isFavorite: next } : d));
    try {
      await setQuestionFavorite(question.id, next);
    } catch (e) {
      console.error(e);
      setAt(!next);
      setDetail((d) => (d && d.id === question.id ? { ...d, isFavorite: !next } : d));
      setError({ message: '별표를 바꾸지 못했어요. 잠시 후 다시 해보세요.', retry: () => void handleToggleFavorite() });
    }
  }

  async function handleStatus(status: QuestionStatus) {
    if (!question) return;
    setError(null);
    const idx = currentIndex;
    try {
      const log = await logQuestion(question.id, status);
      setDetail((d) => (d && d.id === question.id ? { ...d, log } : d));
      setStatuses((prev) => {
        const next = [...prev];
        next[idx] = status;
        return next;
      });
    } catch (e) {
      console.error(e);
      setError({ message: '표시하지 못했어요. 잠시 후 다시 해보세요.', retry: () => void handleStatus(status) });
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

  // 단축키: ← 이전 · → 다음 · Space 답 보기 · 1 이해완료 · 2 복습필요(답이 열렸을 때만).
  // 화면 안내 없이 버튼 title·aria-keyshortcuts로만. ref로 최신 핸들러 → 리스너는 한 번 등록
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    keyRef.current = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || isTypingTarget(e.target)) return;
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      // 버튼·링크에 포커스가 있으면 Space는 그 버튼을 누르는 키라 건드리지 않음
      else if (
        e.key === ' ' &&
        !onCompletion &&
        !showAnswer &&
        !loading &&
        !(e.target instanceof HTMLElement && e.target.closest('button, a'))
      ) {
        e.preventDefault();
        void handleShowAnswer();
      } else if ((e.key === '1' || e.key === '2') && !onCompletion && showAnswer) {
        void handleStatus(e.key === '1' ? 'understood' : 'review_needed');
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const firstUnmarked = statuses.findIndex((s) => !s);
  const label = onCompletion
    ? '완료'
    : question?.categoryKey
      ? (categoryNames[question.categoryKey] ?? '질문')
      : '질문';
  const marked = statuses.filter(Boolean).length;
  // 넘길 때 카드 안 내용만 150ms(가로 8px + 투명도). prefers-reduced-motion이면 없음
  const swap = direction === 'right' ? 'animate-learn-swap-right' : 'animate-learn-swap-left';

  // 최소 높이(420px, 화면이 낮으면 55vh) — 답을 열기 전에도 아래가 휑하지 않게. 질문·[답 보기]는 세로 가운데
  return (
    <article className="flex min-h-[min(420px,55vh)] w-full max-w-200 flex-col gap-5 rounded-lg border border-line bg-surface px-7 pt-5.5 pb-6">
      {/* 위 줄 */}
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-[13px] font-semibold text-ink-muted">{label}</span>
          {onCompletion ? null : (
            <>
              <span aria-hidden className="h-3.5 w-px bg-rule" />
              <span className="text-sm text-ink-muted tabular-nums">
                <span className="font-semibold text-ink-strong">{currentIndex + 1}</span> / {total}
              </span>
              {mode === 'daily' ? (
                <span
                  role="img"
                  aria-label={`${total}문제 중 ${currentIndex + 1}번째, ${marked}개 표시함`}
                  className="flex items-center gap-3 pl-1"
                >
                  {statuses.map((s, i) => (
                    <span
                      key={questions[i].id}
                      title={`${i + 1}번 · ${s ? STATUS_LABEL[s] : '표시 안 함'}`}
                      className={`h-2 w-2 rounded-full ${
                        s === 'understood' ? 'bg-primary' : s === 'review_needed' ? 'bg-warn' : 'bg-track'
                      } ${
                        i === currentIndex
                          ? 'shadow-[0_0_0_2px_var(--rally-surface),0_0_0_4px_var(--rally-primary)]'
                          : ''
                      }`}
                    />
                  ))}
                </span>
              ) : mode === 'review' && question?.markedAt ? (
                <span className="text-[13px] text-ink-muted">{monthDay(question.markedAt)}에 표시</span>
              ) : null}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {currentStatus ? <StatusText status={currentStatus} /> : null}
          {onCompletion ? null : (
            <button
              type="button"
              onClick={handleToggleFavorite}
              aria-label={currentFavorite ? '별표 빼기' : '별표'}
              aria-pressed={currentFavorite}
              title={currentFavorite ? '별표 빼기' : '별표'}
              className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md hover:bg-row-hover ${
                currentFavorite ? 'text-primary' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Star className="h-4.5 w-4.5" fill={currentFavorite ? 'currentColor' : 'none'} aria-hidden />
            </button>
          )}
          <NavButton onClick={handlePrev} disabled={!canGoPrev} label="이전" keys="ArrowLeft" hint="←">
            <ChevronLeft className="h-4.5 w-4.5" aria-hidden />
          </NavButton>
          <NavButton onClick={handleNext} disabled={!canGoNext} label="다음" keys="ArrowRight" hint="→">
            <ChevronRight className="h-4.5 w-4.5" aria-hidden />
          </NavButton>
        </div>
      </div>

      <div
        key={onCompletion ? 'completion' : question!.id}
        className={`flex flex-1 flex-col gap-5 ${showAnswer && !onCompletion ? '' : 'justify-center pb-5'} ${swap}`}
      >
        {onCompletion ? (
          <CompletionBody
            mode={mode}
            total={total}
            understood={statuses.filter((s) => s === 'understood').length}
            reviewNeeded={statuses.filter((s) => s === 'review_needed').length}
            onGoUnmarked={firstUnmarked >= 0 ? () => goTo(firstUnmarked, 'left') : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-y-5">
              <span className="text-xl leading-[1.45] font-bold text-heading">Q.</span>
              <p className="text-xl leading-[1.45] font-semibold text-ink-strong">{question!.content}</p>
              {error ? (
                <p className="col-start-2 flex flex-wrap items-center gap-x-2 text-sm text-alert" role="alert">
                  {error.message}
                  <button
                    type="button"
                    onClick={error.retry}
                    className="cursor-pointer font-semibold underline underline-offset-2"
                  >
                    다시 시도
                  </button>
                </p>
              ) : null}
              {!showAnswer ? (
                <div className="col-start-2">
                  <button
                    type="button"
                    onClick={handleShowAnswer}
                    disabled={loading}
                    aria-keyshortcuts="Space"
                    title="답 보기 (Space)"
                    className={`${BUTTON_PRIMARY} gap-2`}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    답 보기
                  </button>
                </div>
              ) : null}
            </div>

            {showAnswer && detail ? (
              <>
                <section className="flex flex-col gap-3 border-t border-divider pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold text-heading">A.</span>
                    <button type="button" onClick={() => setShowAnswer(false)} className={BUTTON_TEXT}>
                      답 접기
                    </button>
                  </div>
                  <AnswerBody text={detail.answer} />
                  {detail.tip ? <TipBlock tip={detail.tip} /> : null}
                </section>
                <div className="flex flex-wrap items-center gap-2 border-t border-divider pt-4">
                  <MarkButton
                    on={currentStatus === 'understood'}
                    onClick={() => void handleStatus('understood')}
                    keys="1"
                    title="이해완료 (1)"
                    icon={<Check className="h-4 w-4" aria-hidden />}
                  >
                    이해완료
                  </MarkButton>
                  <MarkButton
                    on={currentStatus === 'review_needed'}
                    onClick={() => void handleStatus('review_needed')}
                    keys="2"
                    title="복습필요 (2)"
                    icon={<RotateCw className="h-4 w-4" aria-hidden />}
                  >
                    복습필요
                  </MarkButton>
                  {/* 표시한 뒤에만 — 자동으로 넘기지 않음(답을 다시 읽을 틈) */}
                  {currentStatus ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-keyshortcuts="ArrowRight"
                      className={`${BUTTON_PRIMARY} ml-auto gap-1`}
                    >
                      {currentIndex === total - 1 ? '마치기' : '다음 질문'}
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

function StatusText({ status }: { status: QuestionStatus }) {
  return status === 'understood' ? (
    <span className="mr-1 inline-flex items-center gap-1 text-[13px] font-semibold text-primary">
      <Check className="h-3.5 w-3.5" aria-hidden />
      이해완료
    </span>
  ) : (
    <span className="mr-1 inline-flex items-center gap-1 text-[13px] font-semibold text-warn">
      <RotateCw className="h-3.5 w-3.5" aria-hidden />
      복습필요
    </span>
  );
}

function NavButton({
  onClick,
  disabled,
  label,
  keys,
  hint,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  keys: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-keyshortcuts={keys}
      title={`${label} (${hint})`}
      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md border border-btn-border bg-btn-bg text-ink hover:border-heading disabled:cursor-default disabled:border-divider disabled:text-icon-faint disabled:hover:border-divider"
    >
      {children}
    </button>
  );
}

function MarkButton({
  on,
  onClick,
  keys,
  title,
  icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  keys: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  // 두 버튼 같은 선택 모양 — 색 구분은 위 줄 상태 글자·점에서만
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-keyshortcuts={keys}
      title={title}
      className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md px-4 text-sm ${
        on
          ? 'bg-chip-on-bg font-bold text-heading shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
          : 'bg-btn-bg text-ink shadow-[inset_0_0_0_1px_var(--rally-btn-border)] hover:shadow-[inset_0_0_0_1px_var(--rally-heading)]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// 답 본문 — 내용은 그대로, 빈 줄은 문단, "- "·"• "·"1. "로 시작하는 줄은 목록으로 그림
function AnswerBody({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, '\n').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="flex max-w-165 flex-col gap-3 text-base leading-[1.75] text-ink">
      {blocks.map((block, bi) => {
        const lines = block.split('\n');
        const isUl = lines.every((l) => /^\s*[-•*]\s+/.test(l));
        const isOl = lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        if (isUl || isOl) {
          const items = lines.map((l) => l.replace(isUl ? /^\s*[-•*]\s+/ : /^\s*\d+[.)]\s+/, ''));
          const List = isOl ? 'ol' : 'ul';
          return (
            <List key={bi} className={`flex flex-col gap-1.5 pl-5.5 ${isOl ? 'list-decimal' : 'list-disc'}`}>
              {items.map((it, ii) => (
                <li key={ii}>{it}</li>
              ))}
            </List>
          );
        }
        return (
          <p key={bi} className="whitespace-pre-wrap">
            {block}
          </p>
        );
      })}
    </div>
  );
}

// 꼬리 질문 — 답의 일부가 아니라 "덧붙인 것"으로 읽히게 thead 바탕 + 왼쪽 선
function TipBlock({ tip }: { tip: string }) {
  const items = tip
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*—]\s*/, '').trim())
    .filter(Boolean);
  return (
    <div className="mt-1 flex max-w-165 flex-col gap-1.5 rounded-r-md border-l-2 border-rule bg-thead px-4.5 py-3.5">
      <span className="text-sm font-bold text-ink-soft">이어서 물어볼 만한 질문</span>
      <ul className="flex flex-col gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[15px] text-ink-soft">
            <span aria-hidden className="text-icon-faint">
              —
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompletionBody({
  mode,
  total,
  understood,
  reviewNeeded,
  onGoUnmarked,
}: {
  mode: LearnMode;
  total: number;
  understood: number;
  reviewNeeded: number;
  onGoUnmarked?: () => void;
}) {
  const skipped = total - understood - reviewNeeded;
  const title =
    mode === 'review' ? '복습 완료!' : mode === 'favorites' ? '별표 훑기 완료!' : '오늘의 학습 완료!';
  const desc =
    mode === 'review'
      ? '이해완료로 바꾼 질문은 이 목록에서 빠져요.'
      : mode === 'favorites'
        ? `별표한 질문 ${total}개를 다 봤어요.`
        : `내일 새로운 ${total}문제로 만나요.`;
  const counts =
    mode === 'favorites'
      ? []
      : [
          { label: '이해완료', value: understood, cls: 'text-primary' },
          { label: '복습필요', value: reviewNeeded, cls: 'text-warn' },
          ...(mode === 'daily' ? [{ label: '표시 안 함', value: skipped, cls: 'text-ink-muted' }] : []),
        ];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-heading">{title}</h2>
        <p className="text-[15px] text-ink-soft">{desc}</p>
      </div>
      {counts.length > 0 ? (
        <dl className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-divider pt-4">
          {counts.map((c) => (
            <div key={c.label} className="flex items-baseline gap-2">
              <dt className="text-sm text-ink-soft">{c.label}</dt>
              <dd className={`text-xl font-semibold tabular-nums ${c.cls}`}>{c.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {mode === 'daily' && skipped > 0 && onGoUnmarked ? (
        <button
          type="button"
          onClick={onGoUnmarked}
          className="inline-flex min-h-10 w-fit cursor-pointer items-center text-sm text-heading hover:underline"
        >
          표시 안 한 질문 보기 ›
        </button>
      ) : null}
    </div>
  );
}
