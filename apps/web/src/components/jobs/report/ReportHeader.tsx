// 인쇄 상단 헤더. 서버에서 필터 상태 + 총 건수 받아 표시.
// 화면과 인쇄본 모두에 노출. 스타일은 최소한 — 인쇄 CSS가 나머지 조정.
// 오른쪽 시각은 "기준"(화면을 연 시각) — 화면에서도 보여서 "인쇄:"는 실제 인쇄 시각처럼 읽혔음.

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
    <header data-report-header className="flex items-end justify-between gap-4 border-b border-rule pb-3">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-ink-strong">Rally · 취업활동 표</h1>
        <p className="text-sm text-ink-soft">
          {rangeLabel} · {count}건
        </p>
      </div>
      <p className="shrink-0 text-[13px] text-ink-muted">
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
      기준 {now.getFullYear()}.{pad(now.getMonth() + 1)}.{pad(now.getDate())}{' '}
      {pad(now.getHours())}:{pad(now.getMinutes())}
    </>
  );
}
