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
      aria-labelledby="ranking-title"
      className="flex flex-col rounded-lg border border-line bg-surface px-6 gap-1.5 pt-5.5 pb-3"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="ranking-title" className="text-[17px] font-bold text-heading">
          요즘 꾸준한 루틴
        </h2>
        <span
          title={`지난 ${weeks}주(${windowDays}일) 중 그 블록을 체크한 날`}
          className="text-[13px] text-ink-muted"
        >
          지난 {weeks}주 · {windowDays}일 중
        </span>
      </div>
      {ranked.length === 0 ? (
        <p className="py-8 text-center text-ink-soft">
          지난 {weeks}주 동안 체크한 루틴이 없어요.
        </p>
      ) : (
        <ol>
          {ranked.map(({ block, checked, rate }, idx) => (
            <li
              key={block.id}
              className="grid min-h-10.5 grid-cols-[20px_96px_minmax(0,1fr)_100px] items-center gap-3 border-b border-divider text-sm last:border-b-0"
            >
              <span className="text-ink-muted">{idx + 1}</span>
              <span className="truncate font-medium text-ink" title={block.label}>
                {block.label}
              </span>
              <span className="block h-1 bg-track">
                <span className="block h-full bg-primary" style={{ width: `${rate}%` }} />
              </span>
              <span className="text-right text-ink-soft">
                <strong className="font-semibold text-ink">{checked}일</strong> · {rate}%
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
