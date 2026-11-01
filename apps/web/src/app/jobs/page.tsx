import { unstable_rethrow } from 'next/navigation';
import { Suspense } from 'react';
import { HighlightScroller } from '../../components/jobs/HighlightScroller';
import { JobsClientView } from '../../components/jobs/JobsClientView';
import { JobsSkeleton } from '../../components/jobs/JobsSkeleton';
import {
  getCompanies,
  getCompanyEvents,
  getCompanyTypes,
  listDocuments,
} from '../../lib/api';

type JobsSearchParams = Awaited<PageProps<'/jobs'>['searchParams']>;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function JobsPage({ searchParams }: PageProps<'/jobs'>) {
  const sp = await searchParams;
  // 제목·도구 줄은 JobsFilters가 그림 (docs/design/rally-jobs.html).
  return (
    <div className="min-h-screen bg-paper font-plex text-[15px] leading-normal text-ink tabular-nums">
      <div className="mx-auto flex max-w-310 flex-col gap-5 px-4 pt-6 pb-16 md:px-10 md:pt-9">
        <Suspense fallback={<JobsSkeleton />}>
          <JobsContent sp={sp} />
        </Suspense>
      </div>
    </div>
  );
}

async function JobsContent({ sp }: { sp: JobsSearchParams }) {
  // Only server-narrowing filters go to getCompanies. type1/type2/priority/
  // status는 클라이언트에서 in-memory 필터 (JobsClientView가 소유)라 서버 왕복
  // 없이 chip 반응이 즉각. 서버로 보낼 필터는 실제로 payload를 좁히는 것들만.
  const favorite = first(sp.favorite) === '1';
  const hiringRaw = first(sp.hiring);
  const isHiring = hiringRaw === '1' ? true : undefined;
  const rawQ = first(sp.q);
  const search = rawQ && rawQ.trim() ? rawQ.trim() : undefined;
  const highlightId = first(sp.highlight);

  const [companyTypes, rows, allEvents, documents] = await Promise.all([
    getCompanyTypes(),
    getCompanies({
      isFavorite: favorite ? true : undefined,
      isHiring,
      search,
    }),
    getCompanyEvents(),
    // 서류 API가 죽어도 채용 목록은 띄움 — 제출본 열만 빈 상태로.
    listDocuments().catch((e: unknown) => {
      unstable_rethrow(e);
      console.error('[jobs] listDocuments', e);
      return [];
    }),
  ]);

  // 회사별 이벤트 그룹핑. 각 행에 자기 이벤트만 전달해서 EventsPopover 바로 사용.
  const eventsByCompany = new Map<string, typeof allEvents>();
  for (const e of allEvents) {
    const arr = eventsByCompany.get(e.companyId);
    if (arr) arr.push(e);
    else eventsByCompany.set(e.companyId, [e]);
  }

  return (
    <>
      <JobsClientView
        allRows={rows}
        companyTypes={companyTypes}
        eventsByCompany={eventsByCompany}
        documents={documents}
        highlightId={highlightId}
      />
      <Suspense fallback={null}>
        <HighlightScroller />
      </Suspense>
    </>
  );
}
