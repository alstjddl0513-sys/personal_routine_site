import type { WeeklyVolumeEntry } from '@repo/shared';
import { addDays, mondayOf, toISODate } from '../../lib/routines-week';
import { WeeklyVolumeChart, type VolumeWeek } from './stats/WeeklyVolumeChart';

interface Props {
  entries: WeeklyVolumeEntry[];
  today: Date;
  weeks?: number;
  /** 가장 이른 운동한 날(ISO) — 이 주 앞은 '기록 시작 전'이라 그래프를 비움. 없으면 전부 비움 */
  firstDay: string | null;
}

// 주간 볼륨 카드 — 그래프만(이번 주 숫자·지난주 비교는 요약 띠로).
export function WeeklyVolumeCard({ entries, today, weeks = 12, firstDay }: Props) {
  const thisMonday = mondayOf(today);
  const byWeek = new Map(entries.map((e) => [e.weekStart, e.volumeKg]));
  const points: VolumeWeek[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const iso = toISODate(addDays(thisMonday, -i * 7));
    points.push({ weekStart: iso, volumeKg: byWeek.get(iso) ?? 0 });
  }
  // 기록 시작 주 = 가장 이른 운동한 날이 있는 주. 그보다 앞 칸은 비움(쉰 주와 구분)
  const firstMonday = firstDay ? toISODate(mondayOf(new Date(`${firstDay}T00:00:00`))) : null;
  const startIndex = firstMonday
    ? Math.max(0, points.findIndex((p) => p.weekStart >= firstMonday))
    : points.length - 1;

  return (
    <section
      aria-labelledby="weekly-volume-title"
      className="flex min-w-0 flex-col gap-3.5 rounded-lg border border-line bg-surface px-6 pt-5.5 pb-5"
    >
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h2 id="weekly-volume-title" className="text-[17px] font-bold text-heading">
          주간 볼륨
        </h2>
        <span className="text-[13px] text-ink-muted">최근 {weeks}주 · kg</span>
      </div>
      <div className="pt-1.5">
        <WeeklyVolumeChart weeks={points} startIndex={startIndex} />
      </div>
    </section>
  );
}
