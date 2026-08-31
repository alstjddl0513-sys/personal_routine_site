interface Point {
  date: string;
  value: number;
}

interface Props {
  points: Point[];
  width?: number;
  height?: number;
  strokeClass?: string;
  fillClass?: string;
}

// Pure SVG line chart. Renders line + dots; no axes, no interactivity.
// Consumers should pre-sort `points` chronologically (oldest first).
// Renders nothing when points.length === 0.
export function MiniLineChart({
  points,
  width = 280,
  height = 72,
  strokeClass = 'stroke-emerald-500',
  fillClass = 'fill-emerald-500',
}: Props) {
  if (points.length === 0) return null;

  const padX = 6;
  const padY = 8;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  function x(i: number): number {
    if (points.length === 1) return width / 2;
    return padX + (i / (points.length - 1)) * innerW;
  }
  function y(v: number): number {
    return padY + innerH - ((v - min) / range) * innerH;
  }

  const path =
    points.length === 1
      ? ''
      : points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.value).toFixed(2)}`)
          .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={`최근 ${points.length}회 top set 무게 추이`}
    >
      {path ? (
        <path
          d={path}
          className={strokeClass}
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {points.map((p, i) => (
        <circle
          key={`${p.date}-${i}`}
          cx={x(i)}
          cy={y(p.value)}
          r={2.2}
          className={fillClass}
        >
          <title>{`${p.date}: ${p.value}kg`}</title>
        </circle>
      ))}
    </svg>
  );
}
