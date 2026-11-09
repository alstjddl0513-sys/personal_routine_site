import Link from 'next/link';
import type { ReactNode } from 'react';
import { InfoTip } from '../../ui/InfoTip';

const kg = (n: number) => Math.round(n).toLocaleString('en-US');

// 요약 띠 — 루틴 통계와 같은 선 띠(카드 X, 위아래 rule). 이번 주 고정이라 제목 줄 오른쪽은 비움.
// 메리골드는 '이번 주 운동한 날' 막대가 목표를 다 채웠을 때만.
export function WorkoutSummaryBand({
  range,
  target,
  streak,
  bestStreak,
  weekDays,
  thisWeekKg,
  lastWeekKg,
}: {
  /** "11.09 – 11.15" */
  range: string;
  /** 주간 운동 목표(일) */
  target: number;
  streak: number;
  bestStreak: number;
  weekDays: number;
  thisWeekKg: number;
  lastWeekKg: number;
}) {
  const left = Math.max(0, target - weekDays);
  const filled = weekDays >= target;
  const diff = Math.round(thisWeekKg) - Math.round(lastWeekKg);

  return (
    <section aria-labelledby="week-summary-title" className="flex flex-col border-y border-rule pt-3.5 pb-5">
      <h2 id="week-summary-title" className="mb-4 text-[17px] font-bold text-heading">
        이번 주 <span className="text-sm font-medium text-ink-muted">{range}</span>
      </h2>
      <div className="grid grid-cols-1 gap-y-5 md:grid-cols-3">
        <Cell
          label="운동 스트릭"
          tip={
            <InfoTip
              id="tip-streak"
              label="스트릭 세는 기준"
              align="start"
              lines={[`주 ${target}일 이상 운동한 주를 연속으로 세요.`]}
            />
          }
          value={streak}
          unit="주 연속"
        >
          {/* 0주일 때 '다시 시작' 안내는 옆 칸("N일 더 하면…")과 같은 말이라 안 씀 */}
          <span className="text-[13px] text-ink-muted">
            최장 {bestStreak}주 · 주 {target}일 이상
          </span>
        </Cell>

        <Cell
          label="이번 주 운동한 날"
          tip={
            <InfoTip
              id="tip-week-days"
              label="운동한 날 세는 기준"
              lines={['횟수를 적은 세트가 1개 이상인 날이에요.']}
            />
          }
          value={weekDays}
          unit={`/ 목표 ${target}일`}
        >
          <span className="block h-1.5 max-w-60 bg-track">
            <span
              className={`block h-full ${filled ? 'bg-marigold' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, (weekDays / target) * 100)}%` }}
            />
          </span>
          <span className="text-[13px] text-ink-soft">
            {filled ? '이번 주 목표를 채웠어요' : `${left}일 더 하면 이번 주도 스트릭에 들어가요`}
          </span>
          <Link
            href="/settings/muscle-goals"
            className="inline-flex w-fit items-center text-[13px] text-heading hover:underline"
          >
            목표 바꾸기 ›
          </Link>
        </Cell>

        <Cell
          label="이번 주 볼륨"
          tip={
            <InfoTip
              id="tip-volume"
              label="볼륨 세는 기준"
              align="end"
              lines={['이번 주 세트의 무게 × 횟수를 더한 값이에요.', '무게 없는 세트는 빠져요.']}
            />
          }
          value={kg(thisWeekKg)}
          zero={Math.round(thisWeekKg) === 0}
          unit="kg"
        >
          <span className="text-[13px] text-ink-muted">
            {diff === 0 ? (
              '지난주와 같아요'
            ) : Math.round(thisWeekKg) === 0 ? (
              // 이번 주를 아직 안 했으면 차이(매번 큰 마이너스) 없이 지난주 값만
              `지난주 ${kg(lastWeekKg)}kg`
            ) : (
              <>
                지난주 {kg(lastWeekKg)}kg{' '}
                {diff > 0 ? (
                  <span className="font-semibold text-primary">+{kg(diff)}kg</span>
                ) : (
                  <span className="text-ink-faint">−{kg(-diff)}kg</span>
                )}
              </>
            )}
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
  zero,
  children,
}: {
  label: string;
  tip: ReactNode;
  value: number | string;
  unit: string;
  zero?: boolean;
  children?: ReactNode;
}) {
  const isZero = zero ?? value === 0;
  return (
    <div className="flex min-w-0 flex-col gap-1.5 border-rule md:px-7 md:first:pl-0 md:not-first:border-l">
      <span className="flex items-center gap-1 text-sm font-semibold text-ink-soft">
        {label}
        {tip}
      </span>
      <span className="flex items-baseline gap-1">
        <span
          className={`text-[40px] leading-[1.1] font-semibold tracking-[-0.02em] ${
            isZero ? 'text-ink-muted' : 'text-ink-strong'
          }`}
        >
          {value}
        </span>
        <span className={`text-base ${isZero ? 'text-ink-muted' : 'text-ink-soft'}`}>{unit}</span>
      </span>
      {children}
    </div>
  );
}
