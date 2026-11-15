import type { QuestionHeatmapEntry } from '@repo/shared';
import { addDays, mondayOf, toISODate } from '../../lib/routines-week';

interface Props {
  entries: QuestionHeatmapEntry[];
  today: Date;
  weeks?: number;
}

const DOW = ['월', '화', '수', '목', '금', '토', '일'];

function buildGrid(today: Date, weeks: number): Date[][] {
  const startMonday = addDays(mondayOf(today), -(weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, r) => addDays(startMonday, w * 7 + r)),
  );
}

// 최근 학습한 날 — "언제 했나"(요일 리듬·빈 날). 주별 막대와 같은 12주를 날짜 단위로.
// 칸 3단계: 0 = track, 1~2 = primary-soft, 3 이상 = primary. 오늘 = 바깥 링, 아직 안 온 날 = 테두리만.
// 색만으로 단계를 구분하니 범례를 둠. 칸 hover·포커스 = 말풍선.
export function LearnHeatmapCard({ entries, today, weeks = 12 }: Props) {
  const grid = buildGrid(today, weeks);
  const byDate = new Map(entries.map((e) => [e.date, e.count]));
  const todayIso = toISODate(today);
  const labelCols = new Set([0, 4, 8]);

  return (
    <section
      aria-labelledby="learn-heatmap-title"
      className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-line bg-surface px-6 pt-5.5 pb-5"
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h2 id="learn-heatmap-title" className="text-[17px] font-bold text-heading">
          최근 학습한 날
        </h2>
        <span className="text-[13px] text-ink-muted">최근 {weeks}주</span>
      </div>
      <div className="flex flex-col gap-3.5 pt-2">
        <div className="flex gap-1">
          <div aria-hidden className="mr-1 flex flex-col gap-1">
            {DOW.map((d) => (
              <span key={d} className="flex h-5 items-center text-xs text-ink-muted">
                {d}
              </span>
            ))}
            <span className="h-4" />
          </div>
          {grid.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map((d) => {
                const iso = toISODate(d);
                const count = byDate.get(iso) ?? 0;
                const isFuture = iso > todayIso;
                const isToday = iso === todayIso;
                const tone = isFuture
                  ? 'shadow-[inset_0_0_0_1px_var(--rally-divider)]'
                  : count === 0
                    ? 'bg-track'
                    : count >= 3
                      ? 'bg-primary'
                      : 'bg-primary-soft';
                const ring = isToday
                  ? 'shadow-[0_0_0_1.5px_var(--rally-surface),0_0_0_3px_var(--rally-primary)]'
                  : '';
                const label = `${d.getMonth() + 1}월 ${d.getDate()}일 · 질문 ${count}개`;
                // 오른쪽 끝 열들은 말풍선을 안쪽(오른쪽 맞춤)으로
                const tipPos = ci >= weeks - 4 ? 'right-0' : ci < 3 ? 'left-0' : 'left-1/2 -translate-x-1/2';
                return isFuture ? (
                  <span key={iso} aria-hidden className={`h-5 w-5 rounded-[3px] ${tone}`} />
                ) : (
                  <span
                    key={iso}
                    tabIndex={0}
                    aria-label={label}
                    className={`group relative h-5 w-5 rounded-[3px] outline-none ${tone} ${ring} hover:outline-2 hover:outline-offset-1 hover:outline-ink-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink-strong`}
                  >
                    <span
                      role="tooltip"
                      className={`pointer-events-none invisible absolute top-7 z-10 rounded-[5px] bg-ink px-2.25 py-1 text-xs whitespace-nowrap text-paper group-hover:visible group-focus-visible:visible ${tipPos}`}
                    >
                      {label}
                    </span>
                  </span>
                );
              })}
              <span aria-hidden className="h-4 w-5 overflow-visible text-[11px] whitespace-nowrap text-ink-muted">
                {labelCols.has(ci) ? `${col[0].getMonth() + 1}.${col[0].getDate()}` : ''}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3.5 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-[3px] bg-track" />
            0개
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-[3px] bg-primary-soft" />
            1~2개
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-3 w-3 rounded-[3px] bg-primary" />
            3개 이상
          </span>
        </div>
      </div>
    </section>
  );
}
