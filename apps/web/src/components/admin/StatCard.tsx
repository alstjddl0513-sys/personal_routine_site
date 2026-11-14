// 개요 숫자 카드 — 라벨 → 큰 숫자 + 단위 (docs/design/rally-admin.html)
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
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-surface px-5 pt-4.5 pb-5">
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
      <span className="flex items-baseline gap-1">
        <span className="text-[34px] leading-[1.15] font-semibold tracking-[-0.02em] text-ink">
          {value}
        </span>
        <span className="text-ink-soft">{unit}</span>
      </span>
    </div>
  );
}
