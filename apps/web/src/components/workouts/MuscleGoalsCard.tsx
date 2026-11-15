import Link from 'next/link';
import {
  DEFAULT_MUSCLE_GOALS,
  type MuscleGoal,
  type MuscleSetCountEntry,
} from '@repo/shared';
import { MUSCLE_OPTIONS } from '../../lib/muscle-groups';

interface Props {
  goals: MuscleGoal[];
  entries: MuscleSetCountEntry[];
}

// 보여주는 순서(가슴 먼저). MUSCLE_OPTIONS의 저장 순서와 따로
const ORDER = ['chest', 'back', 'shoulder', 'arm', 'leg'];

// 부위별 주간 목표 — 5부위를 한 줄 5칸으로(세로로 쌓으면 카드가 길어짐).
// entries는 이번 주(월~일) 완전 세트(무게·횟수) 카운트. 목표가 없는 부위는 DEFAULT_MUSCLE_GOALS로.
// 막대: 평소 primary, 목표를 채우면 메리골드. 100% 넘어도 막대는 100%에서 멈추고 숫자에 %.
export function MuscleGoalsCard({ goals, entries }: Props) {
  const goalByKey = new Map(goals.map((g) => [g.muscleKey, g.weeklySetTarget]));
  const defaultByKey = new Map(DEFAULT_MUSCLE_GOALS.map((d) => [d.muscleKey, d.weeklySetTarget]));
  const countByKey = new Map<string, number>();
  for (const e of entries) {
    if (!e.muscleKey) continue;
    const key = e.muscleKey.trim().toLowerCase();
    countByKey.set(key, (countByKey.get(key) ?? 0) + e.setCount);
  }

  const rows = ORDER.map((key) => MUSCLE_OPTIONS.find((o) => o.key === key))
    .filter((o): o is (typeof MUSCLE_OPTIONS)[number] => !!o)
    .map((opt) => {
      const target = goalByKey.get(opt.key) ?? defaultByKey.get(opt.key) ?? 10;
      const done = countByKey.get(opt.key) ?? 0;
      const pct = target > 0 ? Math.round((done / target) * 100) : 0;
      return { key: opt.key, label: opt.label, target, done, pct };
    });

  return (
    <section
      aria-labelledby="muscle-goals-title"
      className="flex flex-col gap-4.5 rounded-lg border border-line bg-surface px-6 pt-5.5 pb-5"
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h2 id="muscle-goals-title" className="text-[17px] font-bold text-heading">
          부위별 주간 목표
        </h2>
        <Link href="/settings/muscle-goals" className="inline-flex min-h-10 items-center text-sm text-heading hover:underline">
          목표 바꾸기 ›
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-y-4 md:grid-cols-5 md:gap-y-0">
        {rows.map((r) => (
          <li
            key={r.key}
            className="flex min-w-0 flex-col gap-2 border-divider px-0 md:px-5 md:first:pl-0 md:not-first:border-l"
          >
            <span className="text-sm font-semibold text-ink-soft">{r.label}</span>
            <span className="text-[15px] text-ink-muted tabular-nums">
              <span className={`text-[22px] font-semibold ${r.done === 0 ? 'text-ink-muted' : 'text-ink-strong'}`}>
                {r.done}
              </span>{' '}
              / {r.target}세트
              {r.pct > 100 ? <span className="font-normal"> ({r.pct}%)</span> : null}
            </span>
            <span className="block h-1.5 bg-track">
              <span
                className={`block h-full ${r.pct >= 100 ? 'bg-marigold' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, r.pct)}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
