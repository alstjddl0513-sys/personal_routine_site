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
      {/* 데스크톱 상단 / 모바일 하단 — 매일 체크 흐름은 모바일에서 DayView 먼저.
          RoutineTable은 데스크톱 전용(hidden md:block), DayView는 모바일 전용(md:hidden)이라
          각각 자기가 보이는 환경의 order만 신경 쓰면 됨. */}
      <div className="order-2 md:order-1">
        <RoutineRetro
          key={week.from}
          weekStart={week.from}
          initialContent={retroContent}
        />
      </div>

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
