export function StatCard({
  label,
  value,
  hint,
  description,
}: {
  label: string;
  value: number | string;
  hint?: string;
  description?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums">{value}</span>
        {hint ? (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
        ) : null}
      </div>
      {description ? (
        <div className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
          {description}
        </div>
      ) : null}
    </div>
  );
}
