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
  ariaLabel?: string;
  /** Suffix appended to the tooltip value (e.g. 'kg'). Defaults to 'kg' for
   *  back-compat with the original per-exercise top-weight usage. */
  unit?: string;
  /** Hide the per-point dots. Set false for wide sparkline usage where the
   *  stretched `<circle>` renders as an oval (SVG fills can't opt out of
   *  non-uniform scaling like strokes can). Default true. */
  showDots?: boolean;
  strokeWidth?: number;
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
  ariaLabel,
  unit = 'kg',
  showDots = true,
  strokeWidth = 1.5,
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
      aria-label={ariaLabel ?? `최근 ${points.length}회 top set 무게 추이`}
    >
      {path ? (
        <path
          d={path}
          className={strokeClass}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          // Non-scaling-stroke keeps the line the same visual thickness
          // whether the SVG is stretched wide (weekly volume card) or held
          // at natural aspect (per-exercise cards).
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {showDots
        ? points.map((p, i) => (
            <circle
              key={`${p.date}-${i}`}
              cx={x(i)}
              cy={y(p.value)}
              r={2.2}
              className={fillClass}
            >
              <title>{`${p.date}: ${p.value}${unit}`}</title>
            </circle>
          ))
        : null}
    </svg>
  );
}
