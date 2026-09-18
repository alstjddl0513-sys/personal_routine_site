// 인쇄 상단 헤더. 서버에서 필터 상태 + 총 건수 받아 표시.
// 화면과 인쇄본 모두에 노출. 스타일은 최소한 — 인쇄 CSS가 나머지 조정.

interface Props {
  from: string | null;
  to: string | null;
  count: number;
}

function formatDot(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}.${m[2]}.${m[3]}`;
}

export function ReportHeader({ from, to, count }: Props) {
  const fromLabel = formatDot(from);
  const toLabel = formatDot(to);
  const rangeLabel =
    fromLabel && toLabel
      ? `${fromLabel} ~ ${toLabel}`
      : fromLabel
        ? `${fromLabel} 이후`
        : toLabel
          ? `${toLabel} 이전`
          : '전체';

  return (
    <header className="flex items-baseline justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Rally · 취업활동 표 · {rangeLabel} · {count}건
      </h1>
      <p className="text-xs text-zinc-500 dark:text-zinc-500">
        <PrintedAt />
      </p>
    </header>
  );
}

function PrintedAt() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <>
      인쇄: {now.getFullYear()}.{pad(now.getMonth() + 1)}.{pad(now.getDate())}{' '}
      {pad(now.getHours())}:{pad(now.getMinutes())}
    </>
  );
}
