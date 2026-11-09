'use client';

import { useState } from 'react';

export interface VolumeWeek {
  /** 월요일 ISO */
  weekStart: string;
  volumeKg: number;
}

// 판 크기 — 시안과 같은 viewBox. width 100%로 균등 확대(점이 찌그러지지 않게 비율 고정).
const W = 516;
const H = 290;
const X0 = 52;
const X1 = 500;
const Y_TOP = 18;
const Y_BOTTOM = 256;
const LABEL_Y = 282;

const kg = (n: number) => Math.round(n).toLocaleString('en-US');
// '2026-10-26' → '10.26'
const md = (iso: string) => `${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;

// 눈금 최대 — 1·2·2.5·5 × 10ⁿ 중 (최댓값 + 10% 여유) 이상인 가장 작은 수.
// 여유가 없으면 가장 큰 점이 맨 위 선에 붙고 툴팁이 점 아래로 밀림
function niceMax(max: number): number {
  if (max <= 0) return 1000;
  const want = max * 1.1;
  const p = 10 ** Math.floor(Math.log10(want));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= want) return m * p;
  return 10 * p;
}

// 최근 N주 주간 볼륨. 마지막 칸 = 이번 주(진행 중) → 점선 + 빈 원(월요일이라 작아도 "아직 진행 중"으로 읽힘).
// 0kg인 주도 0에 점("쉰 주"). 기록을 시작하기 전 주(startIndex 앞)는 점·선 없이 비우되 가로 자리는 유지.
export function WeeklyVolumeChart({ weeks, startIndex }: { weeks: VolumeWeek[]; startIndex: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = weeks.length;
  const last = n - 1;
  const step = n > 1 ? (X1 - X0) / (n - 1) : 0;
  const max = niceMax(Math.max(0, ...weeks.slice(startIndex).map((w) => w.volumeKg)));
  const x = (i: number) => X0 + i * step;
  const y = (v: number) => Y_BOTTOM - (v / max) * (Y_BOTTOM - Y_TOP);
  const ticks = [0, max / 2, max];

  const shown = weeks.map((w, i) => ({ ...w, i })).filter((w) => w.i >= startIndex);
  const done = shown.filter((w) => w.i < last);
  const current = shown.find((w) => w.i === last);
  const prevOfCurrent = done.at(-1);

  const dateLabels = [0, 4, 8].filter((i) => i >= startIndex && i < last - 1);

  function tipText(i: number): string {
    const w = weeks[i];
    if (i === last) return `이번 주 · ${kg(w.volumeKg)}kg`;
    if (Math.round(w.volumeKg) === 0) return '쉰 주 · 0kg';
    return `${md(w.weekStart)} 주 · ${kg(w.volumeKg)}kg`;
  }

  const tip = hover !== null ? tipText(hover) : null;
  const tipW = tip ? Math.max(84, tip.length * 7 + 22) : 0;
  const tipX = hover !== null ? Math.min(W - tipW, Math.max(0, x(hover) - tipW / 2)) : 0;
  const py = hover !== null ? y(weeks[hover].volumeKg) : 0;
  const tipY = py - 38 < 0 ? py + 12 : py - 38;

  return (
    <svg
      role="img"
      aria-label={`최근 ${n}주 주간 볼륨`}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="block overflow-visible tabular-nums"
      onMouseLeave={() => setHover(null)}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X0} y1={y(t)} x2={X1} y2={y(t)} className="stroke-divider" strokeWidth={1} />
          <text x={X0 - 10} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-ink-muted">
            {kg(t)}
          </text>
        </g>
      ))}

      {done.length > 1 ? (
        <polyline
          points={done.map((w) => `${x(w.i)},${y(w.volumeKg)}`).join(' ')}
          fill="none"
          className="stroke-primary"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
      {current && prevOfCurrent ? (
        <line
          x1={x(prevOfCurrent.i)}
          y1={y(prevOfCurrent.volumeKg)}
          x2={x(current.i)}
          y2={y(current.volumeKg)}
          className="stroke-primary"
          strokeWidth={2}
          strokeDasharray="3 4"
          strokeLinecap="round"
        />
      ) : null}
      {done.map((w) => (
        <circle
          key={w.weekStart}
          cx={x(w.i)}
          cy={y(w.volumeKg)}
          r={hover === w.i ? 4.5 : 3}
          className="fill-primary"
        />
      ))}
      {current ? (
        <circle
          cx={x(current.i)}
          cy={y(current.volumeKg)}
          r={4}
          className="fill-surface stroke-primary"
          strokeWidth={2}
        />
      ) : null}

      {dateLabels.map((i) => (
        <text key={i} x={x(i)} y={LABEL_Y} textAnchor="middle" fontSize={12} className="fill-ink-muted">
          {md(weeks[i].weekStart)}
        </text>
      ))}
      <text x={X1} y={LABEL_Y} textAnchor="end" fontSize={12} fontWeight={600} className="fill-ink-soft">
        이번 주
      </text>

      {hover !== null && tip ? (
        <g pointerEvents="none">
          <line
            x1={x(hover)}
            y1={Y_TOP}
            x2={x(hover)}
            y2={Y_BOTTOM}
            className="stroke-btn-border"
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <rect x={tipX} y={tipY} width={tipW} height={26} rx={5} className="fill-ink" />
          <text x={tipX + tipW / 2} y={tipY + 17} textAnchor="middle" fontSize={12} className="fill-paper">
            {tip}
          </text>
        </g>
      ) : null}

      {/* hover·포커스 영역 — 주마다 세로 띠 하나(점이 작아도 맞추기 쉽게) */}
      {shown.map((w) => (
        <rect
          key={`hit-${w.weekStart}`}
          x={x(w.i) - step / 2}
          y={Y_TOP - 10}
          width={Math.max(step, 24)}
          height={Y_BOTTOM - Y_TOP + 20}
          fill="transparent"
          tabIndex={0}
          aria-label={tipText(w.i)}
          className="cursor-pointer outline-none"
          onMouseEnter={() => setHover(w.i)}
          onFocus={() => setHover(w.i)}
          onBlur={() => setHover(null)}
        />
      ))}
    </svg>
  );
}
