import { Suspense } from 'react';
import { JobsFilters } from '../../components/jobs/JobsFilters';
import { JobsTable } from '../../components/jobs/JobsTable';
import { getCompanies } from '../../lib/api';
import {
  APPLICATION_STATUS_VALUES,
  COMPANY_TYPE_1_VALUES,
  COMPANY_TYPE_2_VALUES,
  PRIORITY_VALUES,
  type ApplicationStatus,
  type CompanyType1,
  type CompanyType2,
  type Priority,
} from '@repo/shared';

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
  const type2 = parseEnumMulti<CompanyType2>(sp.type2, COMPANY_TYPE_2_VALUES);
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

  const rows = await getCompanies({
    type2,
    type1,
    priority,
    applicationStatus,
    isFavorite: favorite ? true : undefined,
    isHiring,
    search,
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">채용 리스트</h1>
        <span className="text-xs text-zinc-500">{rows.length}개</span>
      </header>

      <Suspense fallback={null}>
        <JobsFilters />
      </Suspense>

      <JobsTable rows={rows} />
    </div>
  );
}
