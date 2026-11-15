'use client';

import { useState } from 'react';

export interface LearnWeek {
  /** 월요일 ISO */
  weekStart: string;
  count: number;
}

// 판 크기 — 시안과 같은 viewBox, width 100%로 균등 확대
const W = 516;
const H = 250;
const X0 = 40;
const X1 = 504;
const Y_TOP = 16;
const Y_BOTTOM = 214;
const LABEL_Y = 238;
const BAR_W = 22;

const md = (iso: string) => `${Number(iso.slice(5, 7))}.${Number(iso.slice(8, 10))}`;

// 눈금 최대 — 3칸으로 나눠 떨어지는 보기 좋은 수(3 · 6 · 15 · 30 · 60 …)
function niceMax(max: number): number {
  for (const m of [3, 6, 9, 15, 30, 60, 90, 150, 300, 600]) if (m >= max) return m;
  return Math.ceil(max / 300) * 300;
}

// 주별 학습량 — "얼마나 했나"(양의 흐름). 주(월~일)마다 날짜별 학습한 질문 수의 합.
// 이번 주(마지막 칸)는 진행 중이라 연한 바탕 + 점선 테두리. 쉰 주는 막대 없음(hover "쉰 주").
// 기록을 시작하기 전 주(startIndex 앞)는 비우되 가로 12칸 자리는 유지.
export function WeeklyLearnBars({ weeks, startIndex }: { weeks: LearnWeek[]; startIndex: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = weeks.length;
  const last = n - 1;
  const slot = (X1 - X0) / n;
  const cx = (i: number) => X0 + slot * (i + 0.5);
  const max = niceMax(Math.max(1, ...weeks.map((w) => w.count)));
  const y = (v: number) => Y_BOTTOM - (v / max) * (Y_BOTTOM - Y_TOP);
  const ticks = [0, max / 3, (max / 3) * 2, max];
  const dateLabels = [0, 4, 8].filter((i) => i < last);

  function tipText(i: number): string {
    const w = weeks[i];
    if (i === last) return `이번 주 · 질문 ${w.count}개`;
    if (w.count === 0) return '쉰 주';
    return `${md(w.weekStart)} 주 · 질문 ${w.count}개`;
  }
  const tip = hover !== null ? tipText(hover) : null;
  const tipW = tip ? Math.max(64, tip.length * 7 + 22) : 0;
  const tipX = hover !== null ? Math.min(W - tipW, Math.max(0, cx(hover) - tipW / 2)) : 0;
  const barTop = hover !== null ? y(weeks[hover].count) : 0;
  const tipY = Math.max(0, barTop - 34);

  return (
    <svg
      role="img"
      aria-label={`최근 ${n}주 주별 학습량`}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="block overflow-visible tabular-nums"
      onMouseLeave={() => setHover(null)}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X0} y1={y(t)} x2={X1} y2={y(t)} className="stroke-divider" strokeWidth={1} />
          <text x={X0 - 10} y={y(t) + 4} textAnchor="end" fontSize={11} className="fill-ink-muted">
            {Math.round(t)}
          </text>
        </g>
      ))}

      {weeks.map((w, i) =>
        i < startIndex || w.count === 0 ? null : i === last ? (
          <rect
            key={w.weekStart}
            x={cx(i) - (BAR_W - 1.5) / 2}
            y={y(w.count)}
            width={BAR_W - 1.5}
            height={Y_BOTTOM - y(w.count)}
            className="fill-chip-on-bg stroke-primary"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        ) : (
          <rect
            key={w.weekStart}
            x={cx(i) - BAR_W / 2}
            y={y(w.count)}
            width={BAR_W}
            height={Y_BOTTOM - y(w.count)}
            className="fill-primary"
          />
        ),
      )}

      {dateLabels.map((i) =>
        i >= startIndex ? (
          <text key={i} x={cx(i)} y={LABEL_Y} textAnchor="middle" fontSize={12} className="fill-ink-muted">
            {md(weeks[i].weekStart)}
          </text>
        ) : null,
      )}
      <text x={cx(last)} y={LABEL_Y} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-ink-soft">
        이번 주
      </text>

      {hover !== null && tip ? (
        <g pointerEvents="none">
          <rect x={tipX} y={tipY} width={tipW} height={26} rx={5} className="fill-ink" />
          <text x={tipX + tipW / 2} y={tipY + 17} textAnchor="middle" fontSize={12} className="fill-paper">
            {tip}
          </text>
        </g>
      ) : null}

      {/* hover·포커스 영역 — 주마다 세로 띠 하나(기록 시작 뒤 주만) */}
      {weeks.map((w, i) =>
        i < startIndex ? null : (
          <rect
            key={`hit-${w.weekStart}`}
            x={X0 + slot * i}
            y={Y_TOP - 8}
            width={slot}
            height={Y_BOTTOM - Y_TOP + 16}
            fill="transparent"
            tabIndex={0}
            aria-label={tipText(i)}
            className="outline-none"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          />
        ),
      )}
    </svg>
  );
}
