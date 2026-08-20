import type {
  ApplicationStatus,
  Company,
  CompanyType1,
  CompanyType2,
  Priority,
} from '@repo/shared';

export type CompanyPatch = Partial<
  Pick<
    Company,
    | 'name'
    | 'type1'
    | 'type2'
    | 'priority'
    | 'isHiring'
    | 'isFavorite'
    | 'note'
    | 'postingUrl'
    | 'employmentType'
    | 'applicationDeadline'
    | 'applicationStatus'
    | 'appliedAt'
    | 'applicationDocUrl'
    | 'progressNote'
  >
>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export interface GetCompaniesParams {
  type1?: CompanyType1[];
  type2?: CompanyType2[];
  priority?: Priority[];
  applicationStatus?: ApplicationStatus[];
  isHiring?: boolean;
  isFavorite?: boolean;
  search?: string;
}

export async function getCompanies(params: GetCompaniesParams = {}): Promise<Company[]> {
  // Multi-value filters can't hit the single-value API. Fetch with only favorite/search/hiring,
  // then filter locally. Dataset is ~170 rows so no perf concern.
  const qs = new URLSearchParams();
  if (params.isHiring !== undefined) qs.set('isHiring', String(params.isHiring));
  if (params.isFavorite !== undefined) qs.set('isFavorite', String(params.isFavorite));
  if (params.search) qs.set('search', params.search);

  const url = `${API_BASE}/companies${qs.size ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`GET /companies failed: HTTP ${res.status}`);
  }
  let rows = (await res.json()) as Company[];
  if (params.type1?.length) rows = rows.filter((c) => params.type1!.includes(c.type1));
  if (params.type2?.length) rows = rows.filter((c) => params.type2!.includes(c.type2));
  if (params.priority?.length)
    rows = rows.filter((c) => params.priority!.includes(c.priority));
  if (params.applicationStatus?.length)
    rows = rows.filter((c) => params.applicationStatus!.includes(c.applicationStatus));
  return rows;
}

export type CreateCompanyInput = Pick<Company, 'name' | 'type1' | 'type2'> &
  Partial<Omit<CompanyPatch, 'name' | 'type1' | 'type2'>>;

export async function createCompany(input: CreateCompanyInput): Promise<Company> {
  const res = await fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`POST /companies failed: HTTP ${res.status}`);
  }
  return (await res.json()) as Company;
}

export async function patchCompany(id: string, patch: CompanyPatch): Promise<Company> {
  const res = await fetch(`${API_BASE}/companies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`PATCH /companies/${id} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as Company;
}
