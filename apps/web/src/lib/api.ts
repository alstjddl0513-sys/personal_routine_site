import type {
  ApplicationStatus,
  Company,
  CompanyType1,
  CompanyType2,
  DayNote,
  Priority,
  RoutineCheck,
  TimeBlock,
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

export async function deleteCompany(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/companies/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`DELETE /companies/${id} failed: HTTP ${res.status}`);
  }
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

// --- routines ---

export async function getTimeBlocks(includeArchived = false): Promise<TimeBlock[]> {
  const qs = includeArchived ? '?includeArchived=true' : '';
  const res = await fetch(`${API_BASE}/time-blocks${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /time-blocks failed: HTTP ${res.status}`);
  return (await res.json()) as TimeBlock[];
}

export async function createTimeBlock(input: {
  label: string;
  sortOrder?: number;
  startTime?: number;
}): Promise<TimeBlock> {
  const res = await fetch(`${API_BASE}/time-blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /time-blocks failed: HTTP ${res.status}`);
  return (await res.json()) as TimeBlock;
}

export async function patchTimeBlock(
  id: string,
  patch: Partial<Pick<TimeBlock, 'label' | 'sortOrder' | 'isArchived' | 'startTime'>>,
): Promise<TimeBlock> {
  const res = await fetch(`${API_BASE}/time-blocks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /time-blocks/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as TimeBlock;
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/time-blocks/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE /time-blocks/${id} failed: HTTP ${res.status}`);
}

export async function getRoutineChecks(range: {
  from: string;
  to: string;
}): Promise<RoutineCheck[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(`${API_BASE}/routine-checks?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET /routine-checks failed: HTTP ${res.status}`);
  return (await res.json()) as RoutineCheck[];
}

export async function toggleRoutineCheck(input: {
  blockId: string;
  date: string;
  checked: boolean;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/routine-checks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`PUT /routine-checks failed: HTTP ${res.status}`);
}

export async function getDayNotes(range: {
  from: string;
  to: string;
}): Promise<DayNote[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(`${API_BASE}/day-notes?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET /day-notes failed: HTTP ${res.status}`);
  return (await res.json()) as DayNote[];
}

export async function upsertDayNote(date: string, content: string): Promise<DayNote> {
  const res = await fetch(`${API_BASE}/day-notes/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`PUT /day-notes/${date} failed: HTTP ${res.status}`);
  return (await res.json()) as DayNote;
}
