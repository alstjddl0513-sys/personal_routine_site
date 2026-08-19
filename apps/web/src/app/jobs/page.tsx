import { Suspense } from 'react';
import { JobsFilters } from '../../components/jobs/JobsFilters';
import { JobsTable } from '../../components/jobs/JobsTable';
import { getCompanies } from '../../lib/api';
import { COMPANY_TYPE_2_VALUES, type CompanyType2 } from '@repo/shared';

function parseType2(raw: string | string[] | undefined): CompanyType2 | undefined {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && (COMPANY_TYPE_2_VALUES as readonly string[]).includes(v)
    ? (v as CompanyType2)
    : undefined;
}

export default async function JobsPage({ searchParams }: PageProps<'/jobs'>) {
  const sp = await searchParams;
  const type2 = parseType2(sp.type2);
  const favorite = (Array.isArray(sp.favorite) ? sp.favorite[0] : sp.favorite) === '1';
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const search = rawQ && rawQ.trim() ? rawQ.trim() : undefined;

  const rows = await getCompanies({
    type2,
    isFavorite: favorite ? true : undefined,
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
