'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface KpiPeriod {
  // 총 체크 수.
  checkCount: number;
  // 모든 블록이 체크된 날의 수 ("완료 일수" 엄격 기준).
  doneDays: number;
  // 가능 일수 (주=7, 월=28~31).
  totalDays: number;
  // 완료율 계산용 분모 = blockCount × totalDays.
  blockCount: number;
}

interface Props {
  weekly: KpiPeriod;
  monthly: KpiPeriod;
  // 표시용 라벨 (예: "10월 1주차" / "10월"). 주차는 ISO 비슷 — 목요일 기준 소속 월.
  weekLabel: string;
  monthLabel: string;
  // 라벨 옆 날짜 범위 (예: "11.02 – 11.08" / "11.01 – 11.30").
  weekRange: string;
  monthRange: string;
}

type Scope = 'week' | 'month';

// 요약 띠 — 카드 없이 위아래 선. [주 | 월]은 이 띠의 지표 3개에만 영향이라 띠 머리 줄에.
// 막대는 목표를 다 채웠을 때만 메리골드(완료한 날 = 전체 일수, 달성률 100%).
export function KpiCard({
  weekly,
  monthly,
  weekLabel,
  monthLabel,
  weekRange,
  monthRange,
}: Props) {
  const [scope, setScope] = useState<Scope>('week');
  const data = scope === 'week' ? weekly : monthly;
  const possible = data.blockCount * data.totalDays;
  const rate = possible > 0 ? Math.round((data.checkCount / possible) * 100) : 0;
  const titleLabel = scope === 'week' ? weekLabel : monthLabel;
  const range = scope === 'week' ? weekRange : monthRange;
  const allDone = data.totalDays > 0 && data.doneDays >= data.totalDays;

  return (
    <section
      aria-labelledby="kpi-title"
      className="flex flex-col gap-1.5 border-y border-rule pt-3.5 pb-5.5"
    >
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <h2 id="kpi-title" className="text-[17px] font-bold text-heading">
          {titleLabel}{' '}
          <span className="text-sm font-medium text-ink-muted">{range}</span>
        </h2>
        <div
          role="group"
          aria-label="기간"
          className="inline-flex overflow-hidden rounded-md border border-btn-border"
        >
          <ToggleButton active={scope === 'week'} onClick={() => setScope('week')} edge="left">
            주
          </ToggleButton>
          <ToggleButton active={scope === 'month'} onClick={() => setScope('month')} edge="right">
            월
          </ToggleButton>
        </div>
      </div>
      <div className="grid grid-cols-3">
        <Metric label="체크" value={data.checkCount} unit="회" />
        <Metric
          label="완료한 날"
          value={data.doneDays}
          unit={`/ ${data.totalDays}일`}
          tip="루틴을 전부 체크한 날만 세요"
          pct={data.totalDays > 0 ? (data.doneDays / data.totalDays) * 100 : 0}
          goal={allDone}
        />
        <Metric
          label="평균 달성률"
          value={rate}
          unit="%"
          tip={`${possible}칸 중 ${data.checkCount}칸 체크`}
          pct={rate}
          goal={rate >= 100}
        >
          {data.checkCount === 0 ? (
            <Link href="/routines" className="text-[13px] text-heading hover:underline">
              트래커에서 오늘 체크하기 ›
            </Link>
          ) : null}
        </Metric>
      </div>
    </section>
  );
}

function ToggleButton({
  active,
  onClick,
  edge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  edge: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-10 min-w-14 cursor-pointer px-3.5 text-sm text-heading ${
        edge === 'right' ? 'border-l border-btn-border' : ''
      } ${
        active
          ? 'bg-chip-on-bg font-bold shadow-[inset_0_0_0_2px_var(--rally-chip-on-border)]'
          : 'bg-btn-bg hover:bg-row-hover'
      }`}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  unit,
  tip,
  pct,
  goal,
  children,
}: {
  label: string;
  value: number;
  unit: string;
  tip?: string;
  /** 있으면 6px 막대 */
  pct?: number;
  /** 목표를 다 채움 → 메리골드 */
  goal?: boolean;
  children?: React.ReactNode;
}) {
  const zero = value === 0;
  return (
    <div
      title={tip}
      className="flex flex-col gap-1.5 border-rule px-7 first:pl-0 not-first:border-l"
    >
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
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
      {pct !== undefined ? (
        <span className="block h-1.5 max-w-60 bg-track">
          <span
            className={`block h-full ${goal ? 'bg-marigold' : 'bg-primary'}`}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </span>
      ) : null}
      {children}
    </div>
  );
}
