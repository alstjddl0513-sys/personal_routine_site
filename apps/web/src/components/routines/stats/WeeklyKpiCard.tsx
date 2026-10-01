interface Props {
  checkCount: number;
  doneDays: number;
  blockCount: number;
}

// 이번주 요약 KPI 3개. 데스크톱/모바일 둘 다 3열 유지 — 숫자만이라 공간 적음.
export function WeeklyKpiCard({ checkCount, doneDays, blockCount }: Props) {
  const possible = blockCount * 7;
  const rate = possible > 0 ? Math.round((checkCount / possible) * 100) : 0;
  return (
    <section
      aria-label="이번주 요약"
      className="grid grid-cols-3 gap-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 sm:gap-3 sm:p-4"
    >
      <Metric label="이번주 체크" value={checkCount} unit="회" />
      <Metric label="완료 일수" value={doneDays} unit={`/7일`} />
      <Metric label="평균 달성률" value={rate} unit="%" />
    </section>
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
