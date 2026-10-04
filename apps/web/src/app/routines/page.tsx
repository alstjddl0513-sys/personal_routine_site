import { Suspense } from 'react';
import {
  getDayNotes,
  getRoutineChallenges,
  getRoutineChecks,
  getTimeBlocks,
} from '../../lib/api';
import { parseISODate, weekOf, type WeekInfo } from '../../lib/routines-week';
import { ChallengesList } from '../../components/routines/challenges/ChallengesList';
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
  const [blocks, checks, retroNotes, challenges] = await Promise.all([
    getTimeBlocks(),
    getRoutineChecks({ from: week.from, to: week.to }),
    getDayNotes({ from: week.from, to: week.from }),
    getRoutineChallenges(),
  ]);
  const retroContent = retroNotes[0]?.content ?? '';

  return (
    <>
      {/* 챌린지: 데스크톱 상단(order-1), 모바일 2번째(order-2).
          "지금 뭐에 도전 중인지" 즉시 인지. */}
      <div className="order-2 md:order-1">
        <ChallengesList challenges={challenges} blocks={blocks} />
      </div>

      {/* 회고: 데스크톱 하단(order-3), 모바일 하단(order-3). 일주일 돌아보는 성격이라
          체크/챌린지 끝낸 후 마지막에 쓰기 좋음. */}
      <div className="order-3 md:order-3">
        <RoutineRetro
          key={week.from}
          weekStart={week.from}
          initialContent={retroContent}
        />
      </div>

      {/* 트래커 테이블/DayView — 데스크톱 2번째(md:order-2는 RoutineTable 루트에),
          모바일 가장 위(order-1는 RoutineDayView 루트에). */}
      <RoutineTable blocks={blocks} checks={checks} days={week.days} />
      <RoutineDayView blocks={blocks} checks={checks} days={week.days} />
    </>
  );
}

function RoutinesSkeleton() {
  return (
    <>
      <Skeleton className="h-32" />
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </>
  );
}
