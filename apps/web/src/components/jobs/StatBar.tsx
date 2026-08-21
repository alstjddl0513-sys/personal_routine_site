export function StatBar({
  label,
  count,
  total,
  hint,
}: {
  label: string;
  count: number;
  total: number;
  hint?: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="grid grid-cols-[6rem_1fr_5rem] items-center gap-3">
      <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
        {label}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-800 dark:bg-zinc-200"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-baseline justify-end gap-1.5 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
        <span>{count}</span>
        {hint ? (
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
            {hint}
          </span>
        ) : null}
      </div>
    </div>
  );
}
