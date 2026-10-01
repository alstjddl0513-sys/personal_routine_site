import { Suspense } from 'react';
import {
  getDayNotes,
  getRoutineChecks,
  getTimeBlocks,
} from '../../lib/api';
import { parseISODate, weekOf, type WeekInfo } from '../../lib/routines-week';
import { RoutineDayView } from '../../components/routines/RoutineDayView';
import { RoutineRetro } from '../../components/routines/RoutineRetro';
import { RoutineTable } from '../../components/routines/RoutineTable';
import { RoutineWeekNav } from '../../components/routines/RoutineWeekNav';
import { Skeleton } from '../../components/Skeleton';

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

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <h1 className="text-xl font-semibold">루틴 트래커</h1>
        <RoutineWeekNav week={week} />
      </header>

      <Suspense fallback={<RoutinesSkeleton />}>
        <RoutinesContent week={week} />
      </Suspense>
    </div>
  );
}

async function RoutinesContent({ week }: { week: WeekInfo }) {
  // Retro is one note per week, stored in day_notes keyed by the week's Monday.
  const [blocks, checks, retroNotes] = await Promise.all([
    getTimeBlocks(),
    getRoutineChecks({ from: week.from, to: week.to }),
    getDayNotes({ from: week.from, to: week.from }),
  ]);
  const retroContent = retroNotes[0]?.content ?? '';

  return (
    <>
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          이번주 회고
        </h2>
        <RoutineRetro
          key={week.from}
          weekStart={week.from}
          initialContent={retroContent}
        />
      </section>

      <RoutineTable blocks={blocks} checks={checks} days={week.days} />
      <RoutineDayView blocks={blocks} checks={checks} days={week.days} />
    </>
  );
}

function RoutinesSkeleton() {
  return (
    <>
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </>
  );
}
