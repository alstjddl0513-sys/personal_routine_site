import { Suspense } from 'react';
import type { SchedulerEvent } from '@repo/shared';
import { getSchedulerEvents } from '../../lib/api';
import {
  monthOf,
  parseISOMonth,
  todayInSeoul,
  toISODate,
  type MonthInfo,
} from '../../lib/routines-week';
import { CalendarView } from '../../components/calendar/CalendarView';
import { Skeleton } from '../../components/Skeleton';

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function CalendarPage({
  searchParams,
}: PageProps<'/calendar'>) {
  const sp = await searchParams;
  const monthParam = first(sp.month);
  const dateParam = first(sp.date);

  const anchor =
    (monthParam ? parseISOMonth(monthParam) : null) ?? todayInSeoul();
  const month = monthOf(anchor);
  const initialSelectedIso =
    dateParam && ISO_DATE_RE.test(dateParam) ? dateParam : null;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <Suspense fallback={<CalendarSkeleton />}>
        <CalendarContent
          month={month}
          initialSelectedIso={initialSelectedIso}
        />
      </Suspense>
    </div>
  );
}

async function CalendarContent({
  month,
  initialSelectedIso,
}: {
  month: MonthInfo;
  initialSelectedIso: string | null;
}) {
  const events = await getSchedulerEvents(month.gridFrom, month.gridTo);

  // 날짜별 그룹핑.
  const eventsByDate = new Map<string, SchedulerEvent[]>();
  for (const e of events) {
    const arr = eventsByDate.get(e.date);
    if (arr) arr.push(e);
    else eventsByDate.set(e.date, [e]);
  }

  const todayIso = toISODate(todayInSeoul());

  return (
    <CalendarView
      month={month}
      todayIso={todayIso}
      initialSelectedIso={initialSelectedIso}
      eventsByDate={eventsByDate}
    />
  );
}

function CalendarSkeleton() {
  return (
    <>
      <header className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-40" />
      </header>
      <Skeleton className="h-[32rem]" />
    </>
  );
}
