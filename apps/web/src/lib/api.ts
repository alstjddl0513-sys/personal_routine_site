import type {
  ApplicationStatus,
  BlogPost,
  BlogRefreshResult,
  BlogSource,
  Company,
  CompanyType,
  CompanyType1,
  DayNote,
  Exercise,
  ExerciseStats,
  PreviousWorkout,
  Priority,
  RoutineCheck,
  TimeBlock,
  WorkoutHeatmapEntry,
  WorkoutSession,
  WorkoutSet,
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

// Two fetch paths so the API access token never reaches the browser:
//   - SSR (server component / route handler): hit the upstream directly, token
//     goes in a request header set here.
//   - Client component: hit our own /api/proxy/... which reruns the request on
//     the server side and stamps the token there (see route.ts).
function apiUrl(path: string): string {
  if (typeof window !== 'undefined') return `/api/proxy${path}`;
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  return `${base}${path}`;
}

function authHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') return {};
  const token = process.env.API_ACCESS_TOKEN;
  return token ? { 'x-auth-token': token } : {};
}

export class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface GetCompaniesParams {
  type1?: CompanyType1[];
  // type2는 user-editable이라 문자열 배열. 유효값 검증은 /jobs 페이지가
  // getCompanyTypes()로 받은 키 목록에 대해 SSR 시점에 수행.
  type2?: string[];
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

  const url = apiUrl(`/companies${qs.size ? `?${qs.toString()}` : ''}`);
  const res = await fetch(url, { cache: 'no-store', headers: authHeaders() });
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
  const res = await fetch(apiUrl('/companies'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`POST /companies failed: HTTP ${res.status}`);
  }
  return (await res.json()) as Company;
}

export async function deleteCompany(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/companies/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`DELETE /companies/${id} failed: HTTP ${res.status}`);
  }
}

// --- company-types (user-editable list backing companies.type2) ---

export async function getCompanyTypes(): Promise<CompanyType[]> {
  const res = await fetch(apiUrl('/company-types'), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /company-types failed: HTTP ${res.status}`);
  return (await res.json()) as CompanyType[];
}

export async function createCompanyType(input: {
  key: string;
  label: string;
  sortOrder?: number;
}): Promise<CompanyType> {
  const res = await fetch(apiUrl('/company-types'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /company-types failed: HTTP ${res.status}`);
  return (await res.json()) as CompanyType;
}

export async function patchCompanyType(
  id: string,
  patch: { label?: string; sortOrder?: number },
): Promise<CompanyType> {
  const res = await fetch(apiUrl(`/company-types/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /company-types/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as CompanyType;
}

export async function deleteCompanyType(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/company-types/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE /company-types/${id} failed: HTTP ${res.status}`);
}

export async function patchCompany(id: string, patch: CompanyPatch): Promise<Company> {
  const res = await fetch(apiUrl(`/companies/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
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
  const res = await fetch(apiUrl(`/time-blocks${qs}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /time-blocks failed: HTTP ${res.status}`);
  return (await res.json()) as TimeBlock[];
}

export async function createTimeBlock(input: {
  label: string;
  sortOrder?: number;
  startTime?: number | null;
  endTime?: number | null;
}): Promise<TimeBlock> {
  const res = await fetch(apiUrl('/time-blocks'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /time-blocks failed: HTTP ${res.status}`);
  return (await res.json()) as TimeBlock;
}

export async function patchTimeBlock(
  id: string,
  patch: Partial<Pick<TimeBlock, 'label' | 'sortOrder' | 'isArchived' | 'startTime' | 'endTime'>>,
): Promise<TimeBlock> {
  const res = await fetch(apiUrl(`/time-blocks/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /time-blocks/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as TimeBlock;
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/time-blocks/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE /time-blocks/${id} failed: HTTP ${res.status}`);
}

export async function getRoutineChecks(range: {
  from: string;
  to: string;
}): Promise<RoutineCheck[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(apiUrl(`/routine-checks?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /routine-checks failed: HTTP ${res.status}`);
  return (await res.json()) as RoutineCheck[];
}

export async function toggleRoutineCheck(input: {
  blockId: string;
  date: string;
  checked: boolean;
}): Promise<void> {
  const res = await fetch(apiUrl('/routine-checks'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`PUT /routine-checks failed: HTTP ${res.status}`);
}

export async function getDayNotes(range: {
  from: string;
  to: string;
}): Promise<DayNote[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(apiUrl(`/day-notes?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /day-notes failed: HTTP ${res.status}`);
  return (await res.json()) as DayNote[];
}

export async function upsertDayNote(date: string, content: string): Promise<DayNote> {
  const res = await fetch(apiUrl(`/day-notes/${date}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error(`PUT /day-notes/${date} failed: HTTP ${res.status}`);
  return (await res.json()) as DayNote;
}

// --- workouts ---

export async function getExercises(includeArchived = false): Promise<Exercise[]> {
  const qs = includeArchived ? '?includeArchived=true' : '';
  const res = await fetch(apiUrl(`/exercises${qs}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /exercises failed: HTTP ${res.status}`);
  return (await res.json()) as Exercise[];
}

export async function createExercise(input: {
  name: string;
  targetMuscle?: string;
  defaultSets?: number;
  repMin: number;
  repMax: number;
}): Promise<Exercise> {
  const res = await fetch(apiUrl('/exercises'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /exercises failed: HTTP ${res.status}`);
  return (await res.json()) as Exercise;
}

export async function patchExercise(
  id: string,
  patch: Partial<Pick<Exercise, 'name' | 'targetMuscle' | 'defaultSets' | 'repMin' | 'repMax' | 'sortOrder' | 'isArchived'>>,
): Promise<Exercise> {
  const res = await fetch(apiUrl(`/exercises/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /exercises/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as Exercise;
}

// 409는 세트 이력이 있어 DELETE FK-restrict가 걸린 경우. 호출자는 HttpError.status로 분기.
export async function deleteExercise(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/exercises/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(`DELETE /exercises/${id} failed: HTTP ${res.status}`, res.status);
  }
}

// Returns all sessions for the given date, ordered by createdAt asc.
export async function getWorkoutSessionsByDate(date: string): Promise<WorkoutSession[]> {
  const qs = new URLSearchParams({ date });
  const res = await fetch(apiUrl(`/workout-sessions?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /workout-sessions failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession[];
}

export async function getWorkoutSessionsRange(range: {
  from: string;
  to: string;
}): Promise<WorkoutSession[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(apiUrl(`/workout-sessions?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /workout-sessions failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession[];
}

export async function createWorkoutSession(input: {
  date: string;
  note?: string;
}): Promise<WorkoutSession> {
  const res = await fetch(apiUrl('/workout-sessions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /workout-sessions failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession;
}

export async function patchWorkoutSession(
  id: string,
  patch: { note?: string | null },
): Promise<WorkoutSession> {
  const res = await fetch(apiUrl(`/workout-sessions/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /workout-sessions/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession;
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/workout-sessions/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`DELETE /workout-sessions/${id} failed: HTTP ${res.status}`);
  }
}

export async function getWorkoutSets(sessionId: string): Promise<WorkoutSet[]> {
  const qs = new URLSearchParams({ sessionId });
  const res = await fetch(apiUrl(`/workout-sets?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /workout-sets failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSet[];
}

export interface WorkoutSetInput {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  rir: number | null;
}

export async function batchWorkoutSets(input: {
  sessionId: string;
  exerciseId: string;
  sets: WorkoutSetInput[];
}): Promise<WorkoutSet[]> {
  const res = await fetch(apiUrl('/workout-sets/batch'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`PUT /workout-sets/batch failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSet[];
}

export async function getWorkoutHeatmap(range: {
  from: string;
  to: string;
}): Promise<WorkoutHeatmapEntry[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(apiUrl(`/workout-sets/heatmap?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /workout-sets/heatmap failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutHeatmapEntry[];
}

export async function getExerciseStats(params: {
  exerciseId: string;
  limit?: number;
}): Promise<ExerciseStats> {
  const qs = new URLSearchParams({ exerciseId: params.exerciseId });
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const res = await fetch(apiUrl(`/workout-sets/exercise-stats?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /workout-sets/exercise-stats failed: HTTP ${res.status}`);
  return (await res.json()) as ExerciseStats;
}

// --- export (backup) ---

// Returns the raw JSON text so the caller can hand it straight to a Blob
// without re-serializing (and losing any nuance in Postgres numeric strings,
// timestamp formatting, etc.).
export async function getExportJson(): Promise<string> {
  const res = await fetch(apiUrl('/export'), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /export failed: HTTP ${res.status}`);
  return await res.text();
}

export async function getPreviousWorkout(params: {
  exerciseId: string;
  beforeDate: string;
}): Promise<PreviousWorkout | null> {
  const qs = new URLSearchParams(params);
  const res = await fetch(apiUrl(`/workout-sets/previous?${qs.toString()}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /workout-sets/previous failed: HTTP ${res.status}`);
  // Nest serializes `null` return as an empty body (Content-Length: 0) rather
  // than the string "null", so res.json() would throw. Read as text first.
  const text = await res.text();
  return text ? (JSON.parse(text) as PreviousWorkout) : null;
}

// --- blog ---

export async function getBlogSources(includeInactive = true): Promise<BlogSource[]> {
  const qs = includeInactive ? '' : '?isActive=true';
  const res = await fetch(apiUrl(`/blog-sources${qs}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /blog-sources failed: HTTP ${res.status}`);
  return (await res.json()) as BlogSource[];
}

export async function createBlogSource(input: {
  name: string;
  rssUrl: string;
  siteUrl?: string;
  isActive?: boolean;
}): Promise<BlogSource> {
  const res = await fetch(apiUrl('/blog-sources'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /blog-sources failed: HTTP ${res.status}`);
  return (await res.json()) as BlogSource;
}

export async function patchBlogSource(
  id: string,
  patch: Partial<Pick<BlogSource, 'name' | 'rssUrl' | 'siteUrl' | 'isActive' | 'sortOrder'>>,
): Promise<BlogSource> {
  const res = await fetch(apiUrl(`/blog-sources/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /blog-sources/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as BlogSource;
}

export async function deleteBlogSource(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/blog-sources/${id}`), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(`DELETE /blog-sources/${id} failed: HTTP ${res.status}`, res.status);
  }
}

export async function getBlogPosts(params: {
  sourceId?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<BlogPost[]> {
  const qs = new URLSearchParams();
  if (params.sourceId) qs.set('sourceId', params.sourceId);
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  if (params.offset !== undefined) qs.set('offset', String(params.offset));
  const s = qs.toString();
  const res = await fetch(apiUrl(`/blog-posts${s ? `?${s}` : ''}`), {
    cache: 'no-store',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /blog-posts failed: HTTP ${res.status}`);
  return (await res.json()) as BlogPost[];
}

export async function refreshBlogPosts(): Promise<BlogRefreshResult> {
  const res = await fetch(apiUrl('/blog-posts/refresh'), {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`POST /blog-posts/refresh failed: HTTP ${res.status}`);
  return (await res.json()) as BlogRefreshResult;
}
