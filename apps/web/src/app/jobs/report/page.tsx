import { Suspense } from 'react';
import {
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_VALUES,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type CompanyType1,
  type Priority,
} from '@repo/shared';
import { getCompanies, getCompanyTypes } from '../../../lib/api';
import { Skeleton } from '../../../components/Skeleton';
import { ReportHeader } from '../../../components/jobs/report/ReportHeader';
import { ReportToolbar } from '../../../components/jobs/report/ReportToolbar';
import { ReportTable } from '../../../components/jobs/report/ReportTable';

type ReportSearchParams = Awaited<PageProps<'/jobs/report'>['searchParams']>;

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

function parseIsoDate(raw: string | undefined): string | null {
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

// 취업활동 표 — 개인 아카이브용 인쇄 뷰. `/jobs`의 필터 파라미터를 그대로
// 받고 추가로 `from`, `to` (지원일 범위)와 `includeAll` (미지원/취소 포함)을
// 소비. 편집은 지원일 셀만(AppliedAtPopover) 지원.
export default async function JobsReportPage({
  searchParams,
}: PageProps<'/jobs/report'>) {
  const sp = await searchParams;
  return (
    <div className="flex flex-col gap-3 p-6" data-report-root>
      <Suspense fallback={<ReportSkeleton />}>
        <ReportContent sp={sp} />
      </Suspense>
    </div>
  );
}

async function ReportContent({ sp }: { sp: ReportSearchParams }) {
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
  const type2Raw = first(sp.type2);
  const type2 = type2Raw
    ? type2Raw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  const from = parseIsoDate(first(sp.from));
  const to = parseIsoDate(first(sp.to));
  const includeAll = first(sp.includeAll) === '1';

  const [companyTypes, allRows] = await Promise.all([
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

  // 상태 기본: not_applied · withdrawn 제외. `?status=`로 명시 필터가 있으면
  // 그 결과가 이미 적용됐으므로 추가 필터 skip. includeAll=1이면 모두 포함.
  let rows = allRows;
  if (!applicationStatus && !includeAll) {
    rows = rows.filter(
      (c) =>
        c.applicationStatus !== 'not_applied' &&
        c.applicationStatus !== 'withdrawn',
    );
  }

  // 기간 필터: appliedAt 기준 [from, to]. appliedAt이 null인 회사는 기간
  // 지정이 있으면 제외 (지원일이 미기록이면 아카이브 대상에서 빠지는 게 자연).
  if (from || to) {
    rows = rows.filter((c) => {
      if (!c.appliedAt) return false;
      if (from && c.appliedAt < from) return false;
      if (to && c.appliedAt > to) return false;
      return true;
    });
  }

  // 정렬: 지원일 내림차순 (최근이 위). null은 하단.
  rows = [...rows].sort((a, b) => {
    if (!a.appliedAt && !b.appliedAt) return 0;
    if (!a.appliedAt) return 1;
    if (!b.appliedAt) return -1;
    return b.appliedAt.localeCompare(a.appliedAt);
  });

  return (
    <>
      <ReportHeader from={from} to={to} count={rows.length} />
      <ReportToolbar />
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 print:hidden dark:border-zinc-700">
          조건에 맞는 회사가 없어요. 상단 툴바에서 필터를 조정해보세요.
        </div>
      ) : (
        <ReportTable rows={rows} companyTypes={companyTypes} />
      )}
    </>
  );
}

function ReportSkeleton() {
  return (
    <>
      <Skeleton className="h-8" />
      <Skeleton className="h-10" />
      <Skeleton className="h-64" />
    </>
  );
}
