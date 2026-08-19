import type { Company, CompanyType2 } from '@repo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export interface GetCompaniesParams {
  type2?: CompanyType2;
  isFavorite?: boolean;
  search?: string;
}

export async function getCompanies(params: GetCompaniesParams = {}): Promise<Company[]> {
  // note: API filters by type1 not type2. We fetch all then filter type2 client-side for now.
  // (upgrade the API filter in a later branch if perf becomes an issue with more data)
  const qs = new URLSearchParams();
  if (params.isFavorite !== undefined) qs.set('isFavorite', String(params.isFavorite));
  if (params.search) qs.set('search', params.search);

  const url = `${API_BASE}/companies${qs.size ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`GET /companies failed: HTTP ${res.status}`);
  }
  const all = (await res.json()) as Company[];
  return params.type2 ? all.filter((c) => c.type2 === params.type2) : all;
}
