import { Suspense } from 'react';
import { HighlightScroller } from '../../components/jobs/HighlightScroller';
import { JobsClientView } from '../../components/jobs/JobsClientView';
import { Skeleton } from '../../components/Skeleton';
import { getCompanies, getCompanyEvents, getCompanyTypes } from '../../lib/api';

type JobsSearchParams = Awaited<PageProps<'/jobs'>['searchParams']>;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

export default async function JobsPage({ searchParams }: PageProps<'/jobs'>) {
  const sp = await searchParams;
  return (
    <div className="flex flex-col gap-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">채용 리스트</h1>
      </header>
      <Suspense fallback={<JobsSkeleton />}>
        <JobsContent sp={sp} />
      </Suspense>
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

  const [companyTypes, rows, allEvents] = await Promise.all([
    getCompanyTypes(),
    getCompanies({
      isFavorite: favorite ? true : undefined,
      isHiring,
      search,
    }),
    getCompanyEvents(),
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
        highlightId={highlightId}
      />
      <Suspense fallback={null}>
        <HighlightScroller />
      </Suspense>
    </>
  );
}

function JobsSkeleton() {
  return (
    <>
      <Skeleton className="h-11 max-w-sm" />
      <Skeleton className="h-52" />
      <Skeleton className="h-64" />
    </>
  );
}
