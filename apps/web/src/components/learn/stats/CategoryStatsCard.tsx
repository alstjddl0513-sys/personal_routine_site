import Link from 'next/link';
import type { QuestionCategory, QuestionCategoryStat } from '@repo/shared';

// 카테고리별 현황 — 어디가 약한지. 줄마다 질문 수 중 표시한 수, 이해완료·복습필요(지금 상태).
// 순서는 설정의 카테고리 순서, 카테고리 없음·지운 카테고리는 맨 아래 '기타'. 질문 0개는 숨김.
// 디자인 개편 전 — 모양은 zinc, 숫자 기준만 확정.
export function CategoryStatsCard({
  stats,
  categories,
}: {
  stats: QuestionCategoryStat[];
  categories: QuestionCategory[];
}) {
  const byKey = new Map(stats.map((s) => [s.categoryKey, s]));
  const known = new Set(categories.map((c) => c.key));
  const rows = [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({ key: c.key as string | null, label: c.label, s: byKey.get(c.key) }))
    .filter((r): r is { key: string | null; label: string; s: QuestionCategoryStat } => !!r.s && r.s.total > 0);
  const other = stats
    .filter((s) => s.categoryKey === null || !known.has(s.categoryKey))
    .reduce(
      (acc, s) => ({
        ...acc,
        total: acc.total + s.total,
        understood: acc.understood + s.understood,
        reviewNeeded: acc.reviewNeeded + s.reviewNeeded,
      }),
      { categoryKey: null, total: 0, understood: 0, reviewNeeded: 0 } as QuestionCategoryStat,
    );
  if (other.total > 0) rows.push({ key: null, label: '기타', s: other });

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">카테고리별 현황</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">아직 질문이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map(({ key, label, s }) => {
            const marked = s.understood + s.reviewNeeded;
            const pct = (n: number) => `${(n / s.total) * 100}%`;
            return (
              <li key={key ?? '__other'} className="flex flex-col gap-1.5 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{label}</span>
                  <span className="text-zinc-500 tabular-nums">
                    질문 {s.total}개 중 표시 {marked} · 이해완료 {s.understood} · 복습필요 {s.reviewNeeded}
                  </span>
                  {key !== null && s.reviewNeeded > 0 ? (
                    <Link
                      href={`/learn/review?categories=${encodeURIComponent(key)}`}
                      className="ml-auto text-xs text-zinc-600 hover:underline dark:text-zinc-400"
                    >
                      복습 ›
                    </Link>
                  ) : null}
                </div>
                {/* 구성 막대: 이해완료 · 복습필요 · 나머지(아직 안 봄) */}
                <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <span className="h-full bg-primary" style={{ width: pct(s.understood) }} />
                  <span className="h-full bg-warn" style={{ width: pct(s.reviewNeeded) }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
