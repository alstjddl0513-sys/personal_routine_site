import Link from 'next/link';
import type { QuestionCategory, QuestionCategoryStat } from '@repo/shared';

// 좁은 화면(모바일)은 구성 막대 열을 숨겨 폭을 맞춤 — 가로 스크롤 X
const COLS =
  'grid grid-cols-[minmax(0,1fr)_36px_36px_52px_52px_44px] items-center gap-2 md:grid-cols-[148px_minmax(0,1fr)_56px_56px_68px_68px_64px] md:gap-4 px-3';

// 카테고리별 현황 — 표 한 장: 카테고리 · 구성 막대 · 질문 · 표시 · 이해완료 · 복습필요 · 복습 ›.
// 구성 막대는 카테고리마다 전체 폭 = 그 카테고리 질문 수(이해완료 primary · 복습필요 warn · 나머지 track = 아직 안 봄).
// %는 적지 않음(진도율 숫자 X), 남은 개수는 막대 title로만. 숫자 0은 icon-faint.
// 순서는 설정의 카테고리 순서, 카테고리 없음·지운 카테고리는 맨 아래 '기타'(링크 없음). 질문 0개는 숨김.
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
    <section
      aria-labelledby="category-stats-title"
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface px-6 pt-5.5 pb-5"
    >
      <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="category-stats-title" className="text-[17px] font-bold text-heading">
          카테고리별 현황
        </h2>
        <span className="flex items-center gap-3 text-xs text-ink-muted">
          <Legend className="bg-primary">이해완료</Legend>
          <Legend className="bg-warn">복습필요</Legend>
          <Legend className="bg-track">아직 안 봄</Legend>
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-ink-soft">아직 질문이 없어요.</p>
      ) : (
        <div role="table" className="-mx-3 flex flex-col">
          <div>
            <div
              role="row"
              className={`${COLS} min-h-9 border-y border-divider bg-thead text-[13px] text-ink-muted`}
            >
              <span role="columnheader">카테고리</span>
              <span role="columnheader" aria-label="구성" className="hidden md:block" />
              <span role="columnheader" className="text-center">
                질문
              </span>
              <span role="columnheader" className="text-center">
                표시
              </span>
              <span role="columnheader" className="text-center">
                이해완료
              </span>
              <span role="columnheader" className="text-center">
                복습필요
              </span>
              <span role="columnheader" aria-label="복습 가기" />
            </div>
            {rows.map(({ key, label, s }) => {
              const marked = s.understood + s.reviewNeeded;
              const pct = (n: number) => `${(n / s.total) * 100}%`;
              return (
                <div key={key ?? '__other'} role="row" className={`${COLS} min-h-11 border-b border-divider text-sm hover:bg-row-hover`}>
                  <span role="cell" className="truncate font-semibold text-ink-strong">
                    {label}
                  </span>
                  <span role="cell" title={`아직 안 본 질문 ${s.total - marked}개`} className="hidden h-1.5 bg-track md:flex">
                    <span className="bg-primary" style={{ width: pct(s.understood) }} />
                    <span className="bg-warn" style={{ width: pct(s.reviewNeeded) }} />
                  </span>
                  <span role="cell" className="text-center text-ink-soft">
                    {s.total}
                  </span>
                  <Num value={marked} className="text-ink-strong" />
                  <Num value={s.understood} className="text-primary" />
                  <Num value={s.reviewNeeded} className="text-warn" />
                  <span role="cell" className="flex justify-end">
                    {key !== null && s.reviewNeeded > 0 ? (
                      <Link
                        href={`/learn/review?categories=${encodeURIComponent(key)}`}
                        aria-label={`${label} 복습하러 가기`}
                        className="inline-flex min-h-10 items-center text-sm text-heading hover:underline"
                      >
                        복습 ›
                      </Link>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function Legend({ className, children }: { className: string; children: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-[2px] ${className}`} />
      {children}
    </span>
  );
}

// 숫자 0은 흐리게(icon-faint 400)
function Num({ value, className }: { value: number; className: string }) {
  return (
    <span role="cell" className={`text-center ${value === 0 ? 'text-icon-faint' : `font-semibold ${className}`}`}>
      {value}
    </span>
  );
}
