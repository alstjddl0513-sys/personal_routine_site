import { Suspense } from 'react';
import { BlogSection } from '../../components/today/BlogSection';
import { JobsSection } from '../../components/today/JobsSection';
import { LearnSection } from '../../components/today/LearnSection';
import { RoutineSection } from '../../components/today/RoutineSection';
import { TodayHeader } from '../../components/today/TodayHeader';
import { UpcomingSection } from '../../components/today/UpcomingSection';
import { WorkoutSection } from '../../components/today/WorkoutSection';
import {
  BlogSkeleton,
  HeaderSkeleton,
  ListCardSkeleton,
  PanelSkeleton,
} from '../../components/today/skeletons';

export const metadata = {
  title: '오늘 · Rally',
};

// '오늘' 대시보드 (docs/design/rally-dashboard.html). 카드마다 따로
// 스트리밍 — 느린 API 하나가 다른 카드를 붙잡지 않게. 같은 데이터를 쓰는
// 카드끼리는 lib/today-data.ts의 React cache로 한 번만 fetch.
// 왼쪽 열: 일정·루틴(흰 카드) / 오른쪽 열: 채용·운동·학습(구분선 섹션).
export default function TodayPage() {
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-[1.6] text-ink tabular-nums">
      <div className="mx-auto flex max-w-290 flex-col gap-9 px-4 pt-6 pb-12 md:px-12 md:pt-10 md:pb-18">
        <Suspense fallback={<HeaderSkeleton />}>
          <TodayHeader />
        </Suspense>

        <div className="flex flex-wrap items-start gap-x-12 gap-y-10">
          <div className="flex min-w-0 flex-[1.65_1_540px] flex-col gap-8">
            <Suspense fallback={<ListCardSkeleton rows={4} />}>
              <UpcomingSection />
            </Suspense>
            <Suspense fallback={<ListCardSkeleton rows={5} />}>
              <RoutineSection />
            </Suspense>
          </div>

          <div className="flex min-w-0 flex-[1_1_300px] flex-col">
            <Suspense fallback={<PanelSkeleton rows={2} />}>
              <JobsSection />
            </Suspense>
            <Suspense fallback={<PanelSkeleton rows={5} />}>
              <WorkoutSection />
            </Suspense>
            <Suspense fallback={<PanelSkeleton rows={2} last />}>
              <LearnSection />
            </Suspense>
          </div>
        </div>

        <Suspense fallback={<BlogSkeleton />}>
          <BlogSection />
        </Suspense>
      </div>
    </div>
  );
}
