import { Suspense } from 'react';
import { HighlightScroller } from '../../components/jobs/HighlightScroller';
import { JobsCards } from '../../components/jobs/JobsCards';
import { JobsFilters } from '../../components/jobs/JobsFilters';
import { JobsTable } from '../../components/jobs/JobsTable';
import { Skeleton } from '../../components/Skeleton';
import { getCompanies, getCompanyTypes } from '../../lib/api';
import {
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_VALUES,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type CompanyType1,
  type Priority,
} from '@repo/shared';

type JobsSearchParams = Awaited<PageProps<'/jobs'>['searchParams']>;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function parseEnumMulti<T extends string>(
  raw: string | string[] | undefined,
  values: readonly T[],
): T[] | undefined {
  const v = first(raw);
  if (!v) return undefined;
  const set = new Set(values as readonly string[]);
  const picked = v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => set.has(s)) as T[];
  return picked.length ? picked : undefined;
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
  const type1 = parseEnumMulti<CompanyType1>(sp.type1, COMPANY_TYPE_1_VALUES);
  const priority = parseEnumMulti<Priority>(sp.priority, PRIORITY_VALUES);
  const applicationStatus = parseEnumMulti<ApplicationStatus>(
    sp.status,
    APPLICATION_STATUS_VALUES,
  );
  const favorite = first(sp.favorite) === '1';
  const hiringRaw = first(sp.hiring);
  const isHiring = hiringRaw === '1' ? true : undefined;
  const rawQ = first(sp.q);
  const search = rawQ && rawQ.trim() ? rawQ.trim() : undefined;
  const highlightId = first(sp.highlight);

  // type2는 user-editable이라 예전엔 companyTypes 도착 후에 유효 key로 검증
  // 했지만, getCompanies는 클라이언트 로컬 필터(lib/api.ts)라 무효 key를
  // 넘겨도 filter 매칭 미스로 안전하게 걸러진다. 검증 의존을 끊고 두 fetch를
  // 병렬로 돌려 홈 진입 지연을 절반으로.
  const type2Raw = first(sp.type2);
  const type2 = type2Raw
    ? type2Raw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const [companyTypes, rows] = await Promise.all([
    getCompanyTypes(),
    getCompanies({
      type2,
      type1,
      priority,
      applicationStatus,
      isFavorite: favorite ? true : undefined,
      isHiring,
      search,
    }),
  ]);

  // 빈 상태를 두 갈래로 안내: 필터가 걸려 0건이면 필터 조정을, 진짜 등록
  // 회사 0건이면 툴바의 "+ 추가"로 유도. 신규 유저가 기본 문구를 보고
  // "필터 뭐 풀지?" 혼란 겪는 걸 방지.
  const hasAnyFilter =
    !!type1 || !!type2 || !!priority || !!applicationStatus ||
    favorite || !!isHiring || !!search;

  return (
    <>
      <div className="-mt-2 flex justify-end text-xs text-zinc-500">
        {rows.length}개
      </div>
      <Suspense fallback={null}>
        <JobsFilters companyTypes={companyTypes} />
      </Suspense>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {hasAnyFilter
            ? '조건에 맞는 회사가 없어요. 필터를 조금 풀어보세요.'
            : '아직 등록한 회사가 없어요. 위 툴바의 “+ 추가”로 첫 회사를 담아보세요.'}
        </div>
      ) : (
        <>
          <JobsTable
            rows={rows}
            companyTypes={companyTypes}
            highlightId={highlightId}
          />
          <JobsCards
            rows={rows}
            companyTypes={companyTypes}
            highlightId={highlightId}
          />
        </>
      )}
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
