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
  LearnSkeleton,
  ListCardSkeleton,
} from '../../components/today/skeletons';

export const metadata = {
  title: '오늘 · Rally',
};

// '오늘' 대시보드 (docs/design/rally-dashboard-design.dc.html). 카드마다 따로
// 스트리밍 — 느린 API 하나가 다른 카드를 붙잡지 않게. 같은 데이터를 쓰는
// 카드끼리는 lib/today-data.ts의 React cache로 한 번만 fetch.
// 브랜드 토큰·Plex 폰트는 아직 이 페이지에만 (다른 페이지는 zinc 유지).
export default function TodayPage() {
  return (
    <div className="min-h-screen bg-cream font-plex text-[15px] leading-[1.55] text-ink">
      <div className="mx-auto flex max-w-295 flex-col gap-6 px-4 pt-6 pb-10 md:px-10 md:pt-8 md:pb-16">
        <Suspense fallback={<HeaderSkeleton />}>
          <TodayHeader />
        </Suspense>

        <div className="flex flex-wrap gap-6">
          <Suspense fallback={<LearnSkeleton />}>
            <LearnSection />
          </Suspense>
          <Suspense fallback={<ListCardSkeleton className="flex-[2_1_340px]" />}>
            <UpcomingSection />
          </Suspense>
        </div>

        <div className="flex flex-wrap gap-6">
          <Suspense fallback={<ListCardSkeleton className="flex-[1_1_320px]" rows={5} />}>
            <RoutineSection />
          </Suspense>
          <Suspense fallback={<ListCardSkeleton className="flex-[1_1_320px]" rows={5} />}>
            <WorkoutSection />
          </Suspense>
          <Suspense fallback={<ListCardSkeleton className="flex-[1_1_320px]" rows={3} />}>
            <JobsSection />
          </Suspense>
        </div>

        <Suspense fallback={<BlogSkeleton />}>
          <BlogSection />
        </Suspense>
      </div>
    </div>
  );
}
