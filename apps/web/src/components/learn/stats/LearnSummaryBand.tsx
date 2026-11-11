import Link from 'next/link';
import type { ReactNode } from 'react';
import { InfoTip } from '../../ui/InfoTip';

// 요약 띠 — 운동 통계와 같은 선 띠(카드 X, 위아래 rule), 제목 줄 없음.
// 지금 상태 숫자 3개는 "총 학습 = 이해완료 + 복습필요"라 한 칸에 큰 숫자 + 구성 막대 + 내역.
// 메리골드는 목표가 있는 '오늘 학습' 막대를 다 채웠을 때만(총 학습은 구성 막대라 primary · warn).
export function LearnSummaryBand({
  todayCount,
  quota,
  streak,
  bestStreak,
  understood,
  reviewNeeded,
}: {
  todayCount: number;
  /** 하루 문제 수(5) */
  quota: number;
  streak: number;
  bestStreak: number;
  understood: number;
  reviewNeeded: number;
}) {
  const total = understood + reviewNeeded;
  const left = Math.max(0, quota - todayCount);
  const filled = todayCount >= quota;
  const SMALL_LINK = 'inline-flex min-h-8 w-fit items-center text-[13px] text-heading hover:underline';

  return (
    <section aria-label="요약" className="border-y border-rule pt-4.5 pb-5">
      <div className="grid grid-cols-1 items-start gap-y-5 md:grid-cols-3">
        <Cell label="오늘 학습" value={todayCount} unit={`/ ${quota}문제`}>
          <span className="block h-1.5 max-w-60 bg-track">
            <span
              className={`block h-full ${filled ? 'bg-marigold' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, (todayCount / quota) * 100)}%` }}
            />
          </span>
          {/* 0개일 땐 문구 없이 링크만 — "0 / 5문제"와 링크가 이미 같은 말 */}
          {todayCount === 0 ? null : (
            <span className="text-[13px] text-ink-soft">
              {filled ? `오늘 ${quota}문제를 다 했어요` : `${left}문제 더 하면 오늘 ${quota}문제를 채워요`}
            </span>
          )}
          {filled ? null : (
            <Link href="/learn" className={`${SMALL_LINK} ${todayCount === 0 ? '' : '-mt-1.5'}`}>
              {todayCount === 0 ? '오늘의 학습 하러 가기 ›' : '이어서 하기 ›'}
            </Link>
          )}
        </Cell>

        <Cell
          label="학습 스트릭"
          tip={
            <InfoTip
              id="tip-learn-streak"
              label="스트릭 세는 기준"
              lines={['질문을 하나라도 표시한 날이 이어진 날수예요.', '최장 기록은 최근 180일 안에서 세요.']}
            />
          }
          value={streak}
          unit={streak === 0 ? '일' : '일 연속'}
        >
          {streak === 0 ? (
            <span className="text-[13px] text-ink-soft">오늘 한 문제만 표시하면 다시 시작해요</span>
          ) : null}
          <span className="text-[13px] text-ink-muted">최장 {bestStreak}일</span>
        </Cell>

        <Cell
          label="총 학습"
          tip={
            <InfoTip
              id="tip-learn-total"
              label="총 학습 세는 기준"
              lines={['한 번이라도 이해완료나 복습필요로 표시한 질문이에요.', '지금 상태로 나눠 보여줘요.']}
            />
          }
          value={total}
          unit="개"
        >
          <span className="flex h-1.5 max-w-60 bg-track">
            {total > 0 ? (
              <>
                <span className="bg-primary" style={{ width: `${(understood / total) * 100}%` }} />
                <span className="bg-warn" style={{ width: `${(reviewNeeded / total) * 100}%` }} />
              </>
            ) : null}
          </span>
          <span className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
              이해완료 <strong className="font-semibold text-ink-strong">{understood}</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-2 rounded-full bg-warn" />
              복습필요 <strong className="font-semibold text-ink-strong">{reviewNeeded}</strong>
            </span>
          </span>
        </Cell>
      </div>
    </section>
  );
}

function Cell({
  label,
  tip,
  value,
  unit,
  children,
}: {
  label: string;
  tip?: ReactNode;
  value: number;
  unit: string;
  children?: ReactNode;
}) {
  const zero = value === 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-rule md:px-7 md:first:pl-0 md:not-first:border-l">
      <span className="flex min-h-6 items-center gap-0.5 text-sm font-semibold text-ink-soft">
        {label}
        {tip}
      </span>
      <span className="flex items-baseline gap-1">
        <span
          className={`text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] ${
            zero ? 'text-ink-muted' : 'text-ink-strong'
          }`}
        >
          {value}
        </span>
        <span className={`text-base ${zero ? 'text-ink-muted' : 'text-ink-soft'}`}>{unit}</span>
      </span>
      {children}
    </div>
  );
}
