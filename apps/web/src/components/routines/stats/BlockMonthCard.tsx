import type { RoutineCheck, TimeBlock } from '@repo/shared';
import {
  addDays,
  toISODate,
  type MonthInfo,
} from '../../../lib/routines-week';

interface Props {
  block: TimeBlock;
  month: MonthInfo;
  // 이 블록의 체크 중 month.gridFrom~gridTo 범위 안 것만 전달받음.
  checks: RoutineCheck[];
  today: Date;
}

// 블록 하나의 "이번달" 카드: 왼쪽 이름 · 체크한 날 · 그 블록 연속 / 오른쪽 미니 달력.
// 칸: 체크 primary · 안 한 날 track · 미래 divider 테두리 · 다른 달 비움 · 오늘 링.
export function BlockMonthCard({ block, month, checks, today }: Props) {
  const todayIso = toISODate(today);
  const checkedSet = new Set(checks.map((c) => c.date));

  const inMonthDates: string[] = [];
  for (const d of month.gridDays) {
    if (d.getMonth() + 1 !== month.month) continue;
    inMonthDates.push(toISODate(d));
  }
  const done = inMonthDates.filter((iso) => checkedSet.has(iso)).length;

  // 현재 연속일수: 오늘부터 뒤로 가며 세기. 오늘 아직 체크 안 됐으면 어제부터.
  let streak = 0;
  let cursor = today;
  if (!checkedSet.has(toISODate(cursor))) {
    cursor = addDays(cursor, -1);
  }
  while (checkedSet.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  return (
    <article className="flex items-stretch gap-4 rounded-lg border border-line bg-surface px-4.5 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-[15px] font-bold text-ink" title={block.label}>
          {block.label}
        </h3>
        <span className="mt-1.5 flex items-baseline gap-0.75">
          <span className="text-[26px] leading-[1.1] font-semibold text-ink">{done}</span>
          <span className="text-[13px] text-ink-soft">일 체크</span>
        </span>
        <span className="mt-auto text-[13px] leading-[1.4] text-ink-soft">
          {streak > 0 ? (
            `지금 ${streak}일째`
          ) : (
            <span className="text-ink-muted">오늘 체크하면 다시 시작해요</span>
          )}
        </span>
      </div>
      <div
        role="img"
        aria-label={`${block.label}, ${month.month}월에 ${done}일 체크`}
        className="flex shrink-0 flex-col gap-1"
      >
        <div className="grid grid-cols-[repeat(7,16px)] gap-1 text-center text-[10px] leading-none text-ink-muted">
          {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-[repeat(7,16px)] gap-1">
          {month.gridDays.map((d) => {
            const iso = toISODate(d);
            const inMonth = d.getMonth() + 1 === month.month;
            if (!inMonth) return <span key={iso} className="h-4 w-4" />;
            const isFuture = iso > todayIso;
            const isToday = iso === todayIso;
            const checked = checkedSet.has(iso);
            return (
              <span
                key={iso}
                className={`h-4 w-4 rounded-[3px] ${cellClass(checked, isFuture, isToday)}`}
              />
            );
          })}
        </div>
      </div>
    </article>
  );
}

// 오늘 링: 라이트 button색, 다크 primary(다크 button색은 어두운 칸 위에서 안 보여서).
function cellClass(checked: boolean, isFuture: boolean, isToday: boolean): string {
  if (isToday) {
    return checked
      ? 'bg-primary shadow-[0_0_0_1.5px_var(--rally-surface),0_0_0_3px_var(--rally-button)] dark:shadow-[0_0_0_1.5px_var(--rally-surface),0_0_0_3px_var(--rally-primary)]'
      : 'shadow-[inset_0_0_0_1.5px_var(--rally-button)] dark:shadow-[inset_0_0_0_1.5px_var(--rally-primary)]';
  }
  if (checked) return 'bg-primary';
  if (isFuture) return 'shadow-[inset_0_0_0_1px_var(--rally-divider)]';
  return 'bg-track';
}
