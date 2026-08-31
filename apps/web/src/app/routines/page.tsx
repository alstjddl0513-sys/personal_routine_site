import {
  getDayNotes,
  getRoutineChecks,
  getTimeBlocks,
} from '../../lib/api';
import { addDays, parseISODate, toISODate, weekOf } from '../../lib/routines-week';
import { calcBestDailyStreak, calcDailyStreak } from '../../lib/streak';
import { RoutineRetro } from '../../components/routines/RoutineRetro';
import { RoutineTable } from '../../components/routines/RoutineTable';
import { RoutineWeekNav } from '../../components/routines/RoutineWeekNav';
import { StreakBadge } from '../../components/StreakBadge';

const STREAK_WINDOW_DAYS = 180;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function RoutinesPage({
  searchParams,
}: PageProps<'/routines'>) {
  const sp = await searchParams;
  const weekParam = first(sp.week);
  const today = new Date();
  const anchor = (weekParam ? parseISODate(weekParam) : null) ?? today;
  const week = weekOf(anchor);

  const streakFrom = addDays(today, -(STREAK_WINDOW_DAYS - 1));

  // Retro is one note per week, stored in day_notes keyed by the week's Monday.
  const [blocks, checks, retroNotes, streakChecks] = await Promise.all([
    getTimeBlocks(),
    getRoutineChecks({ from: week.from, to: week.to }),
    getDayNotes({ from: week.from, to: week.from }),
    getRoutineChecks({ from: toISODate(streakFrom), to: toISODate(today) }),
  ]);
  const retroContent = retroNotes[0]?.content ?? '';

  // A day counts as "done" if any block was checked. Row existence = checked.
  const successDays = new Set(streakChecks.map((c) => c.date));
  const currentStreak = calcDailyStreak(successDays, today);
  const bestStreak = calcBestDailyStreak(successDays, streakFrom, today);

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">루틴 트래커</h1>
        <RoutineWeekNav week={week} />
      </header>

      <StreakBadge
        label="루틴 스트릭"
        current={currentStreak}
        best={bestStreak}
        unit="일"
      />

      <RoutineTable blocks={blocks} checks={checks} days={week.days} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          이번주 회고
        </h2>
        <RoutineRetro weekStart={week.from} initialContent={retroContent} />
      </section>
    </div>
  );
}
