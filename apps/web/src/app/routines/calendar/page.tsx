import { Suspense } from 'react';
import { getRoutineChecks, getTimeBlocks } from '../../../lib/api';
import { monthOf, parseISOMonth, type MonthInfo } from '../../../lib/routines-week';
import { CalendarGrid } from '../../../components/routines/CalendarGrid';
import { CalendarMonthNav } from '../../../components/routines/CalendarMonthNav';
import { Skeleton } from '../../../components/Skeleton';

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function RoutinesCalendarPage({
  searchParams,
}: PageProps<'/routines/calendar'>) {
  const sp = await searchParams;
  const monthParam = first(sp.month);
  const anchor = (monthParam ? parseISOMonth(monthParam) : null) ?? new Date();
  const month = monthOf(anchor);

  return (
    <div className="flex flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">루틴 캘린더</h1>
        <CalendarMonthNav month={month} />
      </header>

      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent month={month} />
      </Suspense>
    </div>
  );
}

async function CalendarContent({ month }: { month: MonthInfo }) {
  // Archived blocks are included so historical cells reflect the block set
  // that was actually live on that date (via createdAt / archivedAt).
  const [blocks, checks] = await Promise.all([
    getTimeBlocks(true),
    getRoutineChecks({ from: month.gridFrom, to: month.gridTo }),
  ]);

  const counts = new Map<string, number>();
  for (const c of checks) {
    counts.set(c.date, (counts.get(c.date) ?? 0) + 1);
  }

  return <CalendarGrid month={month} blocks={blocks} checkCountsByDate={counts} />;
}

function CalendarSkeleton() {
  return <Skeleton className="h-96" />;
}
