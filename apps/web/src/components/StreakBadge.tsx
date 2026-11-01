interface Props {
  label: string;
  current: number;
  best: number;
  unit: string; // e.g. '일', '주'
  caption?: string; // e.g. '주 3회+'
}

export function StreakBadge({ label, current, best, unit, caption }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {label}
          {caption && (
            <span className="ml-1 text-[10px] text-zinc-400">· {caption}</span>
          )}
        </span>
        <span className="mt-0.5 text-sm text-zinc-800 dark:text-zinc-200">
          <span aria-hidden>🔥 </span>
          <span className="font-semibold">
            {current}
            {unit}
          </span>
          <span className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>
          <span aria-hidden>🏆 </span>
          <span className="text-zinc-600 dark:text-zinc-400">
            최장 {best}
            {unit}
          </span>
        </span>
      </div>
    </div>
  );
}
