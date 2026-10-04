'use client';

import { useState } from 'react';

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
}

type Scope = 'week' | 'month';

export function KpiCard({ weekly, monthly, weekLabel, monthLabel }: Props) {
  const [scope, setScope] = useState<Scope>('week');
  const data = scope === 'week' ? weekly : monthly;
  const possible = data.blockCount * data.totalDays;
  const rate = possible > 0 ? Math.round((data.checkCount / possible) * 100) : 0;
  const titleLabel = scope === 'week' ? weekLabel : monthLabel;

  return (
    <section
      aria-label={`${titleLabel} 요약`}
      className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:p-4"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 sm:mb-3">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {titleLabel}
        </h2>
        <div
          role="tablist"
          aria-label="기간 전환"
          className="flex rounded-md border border-zinc-200 bg-zinc-50 p-0.5 text-[11px] dark:border-zinc-800 dark:bg-zinc-900"
        >
          <ToggleButton
            active={scope === 'week'}
            onClick={() => setScope('week')}
          >
            주
          </ToggleButton>
          <ToggleButton
            active={scope === 'month'}
            onClick={() => setScope('month')}
          >
            월
          </ToggleButton>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="체크 수" value={data.checkCount} unit="회" />
        <Metric
          label="완료 일수"
          value={data.doneDays}
          unit={`/${data.totalDays}일`}
        />
        <Metric label="평균 달성률" value={rate} unit="%" />
      </div>
    </section>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded px-2 py-0.5 transition-colors ${
        active
          ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
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
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-0.5">
      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
        {label}
      </span>
      <span className="flex items-baseline gap-0.5">
        <span className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 sm:text-2xl">
          {value}
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 sm:text-xs">
          {unit}
        </span>
      </span>
    </div>
  );
}
