import { Flame } from 'lucide-react';

interface Props {
  label: string;
  current: number;
  best: number;
  unit: string; // e.g. '일', '주'
  caption?: string; // e.g. '주 3회+'
  // 'card'(기본): 통계 페이지용 박스. 'pill': /today 헤더용 한 줄 칩
  // ("루틴 12일 연속"). pill은 Rally 토큰 사용.
  variant?: 'card' | 'pill';
}

export function StreakBadge({
  label,
  current,
  best,
  unit,
  caption,
  variant = 'card',
}: Props) {
  if (variant === 'pill') {
    return (
      <span
        className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink"
        title={`최장 ${best}${unit}`}
      >
        <Flame className="h-4 w-4 text-streak" aria-hidden />
        {label}{' '}
        <span className="font-display font-extrabold">{current}</span>
        {unit} 연속
      </span>
    );
  }

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
