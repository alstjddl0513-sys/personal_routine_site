import type { RoutineCheck, TimeBlock } from '@repo/shared';

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[]; // 이 랭킹 window 범위의 체크만.
  windowDays: number; // 분모 (예: 28일 = 4주).
  limit?: number;
}

// 최근 N일간 각 블록의 완료율(=체크 수 / N) 상위 N개.
// StreakBadge(any-block 연속)와 지표가 완전히 달라서 역할 분리 명확.
// streak 기반 랭킹은 변동성 커서(하루 놓치면 0) 완료율로 교체 — 2026-10-01 결정.
export function BlockCompletionRanking({
  blocks,
  checks,
  windowDays,
  limit = 5,
}: Props) {
  const countByBlock = new Map<string, number>();
  for (const c of checks) {
    countByBlock.set(c.blockId, (countByBlock.get(c.blockId) ?? 0) + 1);
  }

  const ranked = blocks
    .map((b) => {
      const checked = countByBlock.get(b.id) ?? 0;
      const rate = Math.round((checked / windowDays) * 100);
      return { block: b, checked, rate };
    })
    .filter((r) => r.rate > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, limit);

  const weeks = Math.round(windowDays / 7);
  return (
    <section
      aria-label="요즘 꾸준한 루틴"
      className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          요즘 꾸준한 루틴
        </h2>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
          지난 {weeks}주 동안
        </span>
      </div>
      {ranked.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
          지난 {weeks}주 동안 체크한 루틴이 없어요.
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {ranked.map(({ block, checked, rate }, idx) => (
            <li
              key={block.id}
              className="flex items-center gap-3 py-2 text-sm"
            >
              <span className="w-5 shrink-0 text-center text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                {idx + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-zinc-800 dark:text-zinc-200">
                {block.label}
              </span>
              <span
                className={`shrink-0 text-xs tabular-nums ${
                  rate >= 80
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : rate >= 50
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {checked}일 · {rate}%
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
