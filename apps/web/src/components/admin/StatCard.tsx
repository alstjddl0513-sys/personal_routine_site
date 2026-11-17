// 개요 숫자 카드 — 라벨 → 큰 숫자 + 단위 (docs/design/rally-admin.html)
// 모바일은 한 줄에 3장이라 작게(여백 · 라벨 · 숫자), sm 이상은 시안 그대로
export function StatCard({
  label,
  value,
  unit = '명',
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-1.5 rounded-lg border border-line bg-surface px-3 pt-3 pb-3.5 sm:justify-start sm:px-5 sm:pt-4.5 sm:pb-5">
      <span className="text-[12.5px] leading-snug font-semibold text-ink-soft sm:text-sm">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
          {value}
        </span>
        <span className="text-sm text-ink-soft sm:text-[15px]">{unit}</span>
      </span>
    </div>
  );
}
