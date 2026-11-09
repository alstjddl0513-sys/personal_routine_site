// 종목 카드 꺾은선 — 그날 최고 무게. 축·라벨 없음.
// 12칸 자리를 고정하고 오른쪽 끝에 맞춤 → 기록이 적으면 왼쪽이 비어 "아직 몇 번 안 함"이 보임.
// 선은 SVG(가로로 늘어나도 두께 그대로 non-scaling-stroke), 최신 점은 HTML(찌그러지지 않게).
const VB_W = 300;
const H = 48;
const PAD_Y = 6;

export function ExerciseSparkline({ values, slots = 12 }: { values: number[]; slots?: number }) {
  const n = values.length;
  if (n === 0) return null;
  const xPct = (i: number) => ((slots - n + i) / (slots - 1)) * 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  // 값이 모두 같으면 가운데
  const yPx = (v: number) => (max === min ? H / 2 : PAD_Y + (H - PAD_Y * 2) * (1 - (v - min) / range));

  if (n === 1) {
    return (
      <div className="relative h-12" aria-hidden>
        <span className="absolute inset-x-0 top-1/2 border-t border-dashed border-divider" />
        <Dot leftPct={50} topPx={H / 2} />
      </div>
    );
  }

  const pts = values.map((v, i) => `${(xPct(i) / 100) * VB_W},${yPx(v)}`).join(' ');
  return (
    <div className="relative h-12" aria-hidden>
      <span className="absolute inset-x-0 bottom-0 border-t border-divider" />
      <svg viewBox={`0 0 ${VB_W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        <polyline
          points={pts}
          fill="none"
          className="stroke-primary"
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <Dot leftPct={xPct(n - 1)} topPx={yPx(values[n - 1])} />
    </div>
  );
}

function Dot({ leftPct, topPx }: { leftPct: number; topPx: number }) {
  return (
    <span
      className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_0_2px_var(--rally-surface)]"
      style={{ left: `${leftPct}%`, top: `${topPx}px` }}
    />
  );
}
