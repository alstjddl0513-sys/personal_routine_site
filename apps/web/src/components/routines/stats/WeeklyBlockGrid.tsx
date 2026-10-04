import type { RoutineCheck, TimeBlock } from '@repo/shared';
import { dowLabel, toISODate } from '../../../lib/routines-week';

interface Props {
  blocks: TimeBlock[];
  checks: RoutineCheck[];
  days: Date[]; // 7 entries, Mon..Sun of the viewed week
  today: Date;
}

// 블록(세로) × 요일(가로) 체크 패턴. "어느 루틴이 꾸준한지" 한눈에.
// 셀 색: 체크됨 = emerald, 미체크(과거/오늘) = zinc-200, 미래 = dashed.
export function WeeklyBlockGrid({ blocks, checks, days, today }: Props) {
  const todayIso = toISODate(today);
  const checkedSet = new Set(checks.map((c) => `${c.blockId}|${c.date}`));

  if (blocks.length === 0) {
    return (
      <section
        aria-label="블록별 요일 체크"
        className="rounded-md border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500 dark:border-zinc-700"
      >
        아직 만든 시간블록이 없어요. 트래커에서 하나 추가해보세요.
      </section>
    );
  }

  return (
    <section
      aria-label="이번주 현황"
      className="flex flex-col gap-2 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        이번주 현황
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1">
        <thead>
          <tr className="text-[10px] text-zinc-400 dark:text-zinc-500">
            <th className="w-24 pb-1 text-left font-normal sm:w-40" />
            {days.map((d) => {
              const iso = toISODate(d);
              const isToday = iso === todayIso;
              return (
                <th
                  key={iso}
                  className={`w-7 pb-1 text-center font-normal tabular-nums ${
                    isToday
                      ? 'text-zinc-700 dark:text-zinc-300'
                      : ''
                  }`}
                >
                  {dowLabel(d)}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => (
            <tr key={block.id}>
              <td className="pr-2 text-xs text-zinc-700 dark:text-zinc-300">
                <span className="line-clamp-1" title={block.label}>
                  {block.label}
                </span>
              </td>
              {days.map((d) => {
                const iso = toISODate(d);
                const key = `${block.id}|${iso}`;
                const checked = checkedSet.has(key);
                const isFuture = iso > todayIso;
                return (
                  <td key={iso} className="px-0.5">
                    <div
                      aria-label={`${block.label} ${iso} ${checked ? '완료' : '미완료'}`}
                      className={`mx-auto h-5 w-5 rounded-sm ${
                        checked
                          ? 'bg-emerald-500 dark:bg-emerald-400'
                          : isFuture
                            ? 'border border-dashed border-zinc-200 dark:border-zinc-700'
                            : 'bg-zinc-100 dark:bg-zinc-800'
                      }`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
