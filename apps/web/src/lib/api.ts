import type {
  AdminStatsOverview,
  AdminUsersPage,
  Announcement,
  ApplicationStatus,
  BanDurationHours,
  BlogPost,
  BlogRefreshResult,
  BlogSource,
  Company,
  CompanyType,
  CompanyType1,
  CreateAnnouncementInput,
  DayNote,
  Document,
  DocumentKind,
  Exercise,
  ExerciseStats,
  InitDocumentInput,
  InitDocumentResult,
  NicknameAvailability,
  PreviousWorkout,
  Priority,
  Profile,
  Question,
  QuestionCategory,
  QuestionDetail,
  QuestionHeatmapEntry,
  QuestionLog,
  QuestionStatsSummary,
  QuestionStatus,
  MuscleGoal,
  MuscleSetCountEntry,
  RandomQuestion,
  RoutineCheck,
  TimeBlock,
  UpdateAnnouncementInput,
  UserAnnouncement,
  WeeklyVolumeEntry,
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
    | 'isRolling'
    | 'applicationStatus'
    | 'appliedAt'
    | 'applicationDocUrl'
    | 'progressNote'
  >
>;

// Two fetch paths so the auth token never reaches the browser:
//   - SSR (server component / route handler): hit the upstream directly, the
//     Supabase access token is read from cookies here and forwarded as
//     Authorization: Bearer.
//   - Client component: hit our own /api/proxy/... which reruns the request on
//     the server side and stamps the same header (see route.ts).
function apiUrl(path: string): string {
  if (typeof window !== 'undefined') return `/api/proxy${path}`;
  const base = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
  return `${base}${path}`;
}

import { getServerAuthorizationHeader } from './supabase/auth-header';

// Server Action reference (see supabase/auth-header.ts) — Next replaces it
// with an RPC stub in the client bundle so no server-only imports leak.
// Server-side, it's a direct in-process call.
async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window !== 'undefined') return {};
  const header = await getServerAuthorizationHeader();
  return header ? { authorization: header } : {};
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
  const res = await fetch(url, { cache: 'no-store', headers: await authHeaders() });
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`DELETE /companies/${id} failed: HTTP ${res.status}`);
  }
}

// --- company-types (user-editable list backing companies.type2) ---

export async function getCompanyTypes(): Promise<CompanyType[]> {
  const res = await fetch(apiUrl('/company-types'), {
    cache: 'no-store',
    headers: await authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /company-types/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as CompanyType;
}

export async function deleteCompanyType(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/company-types/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE /company-types/${id} failed: HTTP ${res.status}`);
}

export async function patchCompany(id: string, patch: CompanyPatch): Promise<Company> {
  const res = await fetch(apiUrl(`/companies/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new HttpError(
      `PATCH /companies/${id} failed: HTTP ${res.status}${body ? ` — ${body}` : ''}`,
      res.status,
    );
  }
  return (await res.json()) as Company;
}

// --- routines ---

export async function getTimeBlocks(includeArchived = false): Promise<TimeBlock[]> {
  const qs = includeArchived ? '?includeArchived=true' : '';
  const res = await fetch(apiUrl(`/time-blocks${qs}`), {
    cache: 'no-store',
    headers: await authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /time-blocks/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as TimeBlock;
}

export async function deleteTimeBlock(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/time-blocks/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
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
    headers: await authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /day-notes failed: HTTP ${res.status}`);
  return (await res.json()) as DayNote[];
}

export async function upsertDayNote(date: string, content: string): Promise<DayNote> {
  const res = await fetch(apiUrl(`/day-notes/${date}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: await authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /exercises/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as Exercise;
}

// 409는 세트 이력이 있어 DELETE FK-restrict가 걸린 경우. 호출자는 HttpError.status로 분기.
export async function deleteExercise(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/exercises/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
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
    headers: await authHeaders(),
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
    headers: await authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /workout-sessions/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession;
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/workout-sessions/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`DELETE /workout-sessions/${id} failed: HTTP ${res.status}`);
  }
}

export async function getWorkoutSets(sessionId: string): Promise<WorkoutSet[]> {
  const qs = new URLSearchParams({ sessionId });
  const res = await fetch(apiUrl(`/workout-sets?${qs.toString()}`), {
    cache: 'no-store',
    headers: await authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /workout-sets/heatmap failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutHeatmapEntry[];
}

export async function getWeeklyVolume(range: {
  from: string;
  to: string;
}): Promise<WeeklyVolumeEntry[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(apiUrl(`/workout-sets/weekly-volume?${qs.toString()}`), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`GET /workout-sets/weekly-volume failed: HTTP ${res.status}`);
  }
  return (await res.json()) as WeeklyVolumeEntry[];
}

export async function getMuscleSets(range: {
  from: string;
  to: string;
}): Promise<MuscleSetCountEntry[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(apiUrl(`/workout-sets/muscle-sets?${qs.toString()}`), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`GET /workout-sets/muscle-sets failed: HTTP ${res.status}`);
  }
  return (await res.json()) as MuscleSetCountEntry[];
}

export async function getMuscleGoals(): Promise<MuscleGoal[]> {
  const res = await fetch(apiUrl('/muscle-goals'), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /muscle-goals failed: HTTP ${res.status}`);
  return (await res.json()) as MuscleGoal[];
}

export async function putMuscleGoal(
  muscleKey: string,
  weeklySetTarget: number,
): Promise<MuscleGoal> {
  const res = await fetch(apiUrl(`/muscle-goals/${encodeURIComponent(muscleKey)}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ weeklySetTarget }),
  });
  if (!res.ok) {
    throw new Error(`PUT /muscle-goals/${muscleKey} failed: HTTP ${res.status}`);
  }
  return (await res.json()) as MuscleGoal;
}

export async function getExerciseStats(params: {
  exerciseId: string;
  limit?: number;
}): Promise<ExerciseStats> {
  const qs = new URLSearchParams({ exerciseId: params.exerciseId });
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const res = await fetch(apiUrl(`/workout-sets/exercise-stats?${qs.toString()}`), {
    cache: 'no-store',
    headers: await authHeaders(),
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
    headers: await authHeaders(),
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
    headers: await authHeaders(),
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
    headers: await authHeaders(),
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
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
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /blog-sources/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as BlogSource;
}

export async function deleteBlogSource(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/blog-sources/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
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
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /blog-posts failed: HTTP ${res.status}`);
  return (await res.json()) as BlogPost[];
}

export async function refreshBlogPosts(): Promise<BlogRefreshResult> {
  const res = await fetch(apiUrl('/blog-posts/refresh'), {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`POST /blog-posts/refresh failed: HTTP ${res.status}`);
  return (await res.json()) as BlogRefreshResult;
}

// --- profiles ---

// Returns null on 404 (no profile yet) so callers can distinguish "not
// created" from "server error" without wrapping in try/catch.
export async function getMyProfile(): Promise<Profile | null> {
  const res = await fetch(apiUrl('/profiles/me'), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /profiles/me failed: HTTP ${res.status}`);
  return (await res.json()) as Profile;
}

// Create-or-update. Used by signup to stamp the profile right after auth.
// Throws HttpError(409) when the nickname clashes with another user's row.
export async function upsertMyProfile(nickname: string): Promise<Profile> {
  const res = await fetch(apiUrl('/profiles/me'), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) {
    throw new HttpError(`PUT /profiles/me failed: HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as Profile;
}

export async function renameMyNickname(nickname: string): Promise<Profile> {
  const res = await fetch(apiUrl('/profiles/me/nickname'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) {
    throw new HttpError(`PATCH /profiles/me/nickname failed: HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as Profile;
}

// 부분 patch — 서버가 deep merge. shape는 Preferences와 동일하되 모든
// 필드가 optional. 서버는 whitelist ValidationPipe로 unknown 키를 400 처리.
export type PreferencesPatch = {
  notif?: {
    master?: boolean;
    morningSummary?: boolean;
    deadline?: boolean;
    routineEvening?: boolean;
    workoutSkip?: {
      enabled?: boolean;
      skipDays?: number;
    };
  };
};

export async function patchMyPreferences(patch: PreferencesPatch): Promise<Profile> {
  const res = await fetch(apiUrl('/profiles/me/preferences'), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new HttpError(
      `PATCH /profiles/me/preferences failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as Profile;
}

// 계정 탈퇴. 성공 시 서버는 auth.users를 지우고 profiles·도메인 데이터가
// FK CASCADE로 함께 정리. 클라는 응답 후 signOut → /login으로 이동.
export async function deleteMyAccount(): Promise<void> {
  const res = await fetch(apiUrl('/profiles/me'), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(`DELETE /profiles/me failed: HTTP ${res.status}`, res.status);
  }
}

// Public endpoint — no auth header needed. Safe to call before signup.
export async function checkNicknameAvailability(
  nickname: string,
): Promise<NicknameAvailability> {
  const qs = new URLSearchParams({ nickname });
  const res = await fetch(apiUrl(`/profiles/check-nickname?${qs.toString()}`), {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`GET /profiles/check-nickname failed: HTTP ${res.status}`);
  }
  return (await res.json()) as NicknameAvailability;
}

// --- learn (CS questions) ---

// Today's 5-question set. Server picks deterministically by (owner, date)
// so the same date always returns the same 5. Client passes its local KST
// date as the seed. `categories`가 있으면 해당 카테고리로 스코프를 좁힘.
export async function getDailyQuestions(
  date: string,
  categories?: readonly string[],
): Promise<RandomQuestion[]> {
  const qs = new URLSearchParams({ date });
  if (categories && categories.length > 0) qs.set('categories', categories.join(','));
  const res = await fetch(apiUrl(`/questions/daily?${qs.toString()}`), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `GET /questions/daily failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as RandomQuestion[];
}

// '복습필요'로 마킹된 질문들. 오래된(updated_at ASC) 순서라 spaced-repetition
// 직관을 따라감. 재답변으로 status가 'understood'로 바뀌어도 리스트가 실시간
// 갱신되진 않고 다음 페이지 진입 시에 반영됨.
export async function getReviewQuestions(
  categories?: readonly string[],
): Promise<RandomQuestion[]> {
  const qs = new URLSearchParams();
  if (categories && categories.length > 0) qs.set('categories', categories.join(','));
  const url = qs.toString()
    ? apiUrl(`/questions/review?${qs.toString()}`)
    : apiUrl('/questions/review');
  const res = await fetch(url, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `GET /questions/review failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as RandomQuestion[];
}

export async function getQuestionDetail(id: string): Promise<QuestionDetail> {
  const res = await fetch(apiUrl(`/questions/${id}`), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(`GET /questions/${id} failed: HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as QuestionDetail;
}

export async function logQuestion(
  id: string,
  status: QuestionStatus,
): Promise<QuestionLog> {
  const res = await fetch(apiUrl(`/questions/${id}/log`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new HttpError(
      `PUT /questions/${id}/log failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as QuestionLog;
}

export async function getQuestionHeatmap(range: {
  from: string;
  to: string;
}): Promise<QuestionHeatmapEntry[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(apiUrl(`/questions/stats/heatmap?${qs.toString()}`), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`GET /questions/stats/heatmap failed: HTTP ${res.status}`);
  }
  return (await res.json()) as QuestionHeatmapEntry[];
}

export async function getQuestionStatsSummary(): Promise<QuestionStatsSummary> {
  const res = await fetch(apiUrl('/questions/stats/summary'), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`GET /questions/stats/summary failed: HTTP ${res.status}`);
  }
  return (await res.json()) as QuestionStatsSummary;
}

// --- questions (관리 페이지 CRUD) ---

export async function getAllQuestions(
  categories?: readonly string[],
): Promise<Question[]> {
  const qs = new URLSearchParams();
  if (categories && categories.length > 0) qs.set('categories', categories.join(','));
  const url = qs.toString()
    ? apiUrl(`/questions?${qs.toString()}`)
    : apiUrl('/questions');
  const res = await fetch(url, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /questions failed: HTTP ${res.status}`);
  return (await res.json()) as Question[];
}

export async function createQuestion(input: {
  content: string;
  answer: string;
  tip?: string | null;
  categoryKey?: string | null;
}): Promise<Question> {
  const res = await fetch(apiUrl('/questions'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /questions failed: HTTP ${res.status}`);
  return (await res.json()) as Question;
}

export async function patchQuestion(
  id: string,
  patch: {
    content?: string;
    answer?: string;
    tip?: string | null;
    categoryKey?: string | null;
  },
): Promise<Question> {
  const res = await fetch(apiUrl(`/questions/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /questions/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as Question;
}

export async function deleteQuestion(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/questions/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`DELETE /questions/${id} failed: HTTP ${res.status}`);
}

// --- question-categories (user-editable list backing questions.category_key) ---

export async function getQuestionCategories(): Promise<QuestionCategory[]> {
  const res = await fetch(apiUrl('/question-categories'), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /question-categories failed: HTTP ${res.status}`);
  return (await res.json()) as QuestionCategory[];
}

export async function createQuestionCategory(input: {
  key: string;
  label: string;
  sortOrder?: number;
}): Promise<QuestionCategory> {
  const res = await fetch(apiUrl('/question-categories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /question-categories failed: HTTP ${res.status}`);
  return (await res.json()) as QuestionCategory;
}

export async function patchQuestionCategory(
  id: string,
  patch: { label?: string; sortOrder?: number },
): Promise<QuestionCategory> {
  const res = await fetch(apiUrl(`/question-categories/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok)
    throw new Error(`PATCH /question-categories/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as QuestionCategory;
}

export async function deleteQuestionCategory(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/question-categories/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok)
    throw new Error(`DELETE /question-categories/${id} failed: HTTP ${res.status}`);
}

// --- documents (이력서·포폴·외부 링크) ---

export async function listDocuments(kind?: DocumentKind): Promise<Document[]> {
  const qs = new URLSearchParams();
  if (kind) qs.set('kind', kind);
  const url = apiUrl(`/documents${qs.size ? `?${qs.toString()}` : ''}`);
  const res = await fetch(url, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(`GET /documents failed: HTTP ${res.status}`);
  return (await res.json()) as Document[];
}

// 2단계 업로드 1단계. 서버가 row insert + Supabase Storage signed upload URL
// 발급. 다음 단계로 반환 uploadUrl에 PUT 하면 됨(`uploadDocumentFile`).
export async function initDocumentUpload(
  input: InitDocumentInput,
): Promise<InitDocumentResult> {
  const res = await fetch(apiUrl('/documents/init'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    // 서버가 상세 에러 메시지 담아 보냄(크기 초과 등).
    const text = await res.text().catch(() => '');
    throw new HttpError(
      `POST /documents/init failed: HTTP ${res.status} ${text}`,
      res.status,
    );
  }
  return (await res.json()) as InitDocumentResult;
}

// 2단계 업로드 2단계. Supabase Storage로 직접 PUT.
// createSignedUploadUrl이 반환하는 uploadUrl은 이미 인증 토큰 포함(x-upsert
// 없이 단일 use). Content-Type은 실제 파일 mime.
export async function uploadDocumentFile(
  uploadUrl: string,
  file: File,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage upload failed: HTTP ${res.status} ${text}`);
  }
}

export async function createLinkDocument(input: {
  title: string;
  url: string;
  notes?: string;
}): Promise<Document> {
  const res = await fetch(apiUrl('/documents/link'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new HttpError(
      `POST /documents/link failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as Document;
}

export type DocumentPatch = {
  title?: string;
  notes?: string;
  isActive?: boolean;
  url?: string;
};

export async function patchDocument(
  id: string,
  patch: DocumentPatch,
): Promise<Document> {
  const res = await fetch(apiUrl(`/documents/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new HttpError(
      `PATCH /documents/${id} failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as Document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/documents/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `DELETE /documents/${id} failed: HTTP ${res.status}`,
      res.status,
    );
  }
}

// 60분 만료 signed URL. 링크 kind는 400 (클라가 url 필드를 직접 열도록).
export async function getDocumentDownloadUrl(
  id: string,
): Promise<{ url: string; expiresAt: string }> {
  const res = await fetch(apiUrl(`/documents/${id}/download`), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `GET /documents/${id}/download failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as { url: string; expiresAt: string };
}

// --- admin (Phase 12.5) ---

export interface ListAdminUsersOptions {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: 'createdAt' | 'lastSignInAt';
}

export async function getAdminStatsOverview(): Promise<AdminStatsOverview> {
  const res = await fetch(apiUrl('/admin/stats/overview'), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `GET /admin/stats/overview failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as AdminStatsOverview;
}

export async function listAdminUsers(
  opts: ListAdminUsersOptions = {},
): Promise<AdminUsersPage> {
  const qs = new URLSearchParams();
  if (opts.page) qs.set('page', String(opts.page));
  if (opts.perPage) qs.set('perPage', String(opts.perPage));
  if (opts.search) qs.set('search', opts.search);
  if (opts.sortBy) qs.set('sortBy', opts.sortBy);
  const url = qs.toString()
    ? apiUrl(`/admin/users?${qs.toString()}`)
    : apiUrl('/admin/users');
  const res = await fetch(url, {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(`GET /admin/users failed: HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as AdminUsersPage;
}

export async function banUser(
  id: string,
  durationHours: BanDurationHours,
): Promise<{ id: string; bannedUntil: string | null }> {
  const res = await fetch(apiUrl(`/admin/users/${id}/ban`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ durationHours }),
  });
  if (!res.ok) {
    throw new HttpError(`POST /admin/users/${id}/ban failed: HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as { id: string; bannedUntil: string | null };
}

export async function unbanUser(
  id: string,
): Promise<{ id: string; bannedUntil: string | null }> {
  const res = await fetch(apiUrl(`/admin/users/${id}/unban`), {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(`POST /admin/users/${id}/unban failed: HTTP ${res.status}`, res.status);
  }
  return (await res.json()) as { id: string; bannedUntil: string | null };
}

export async function deleteUserAsAdmin(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/admin/users/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(`DELETE /admin/users/${id} failed: HTTP ${res.status}`, res.status);
  }
}

export async function listAllAnnouncements(): Promise<Announcement[]> {
  const res = await fetch(apiUrl('/admin/announcements'), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `GET /admin/announcements failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as Announcement[];
}

export async function createAnnouncement(
  input: CreateAnnouncementInput,
): Promise<Announcement> {
  const res = await fetch(apiUrl('/admin/announcements'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new HttpError(
      `POST /admin/announcements failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as Announcement;
}

export async function patchAnnouncement(
  id: string,
  input: UpdateAnnouncementInput,
): Promise<Announcement> {
  const res = await fetch(apiUrl(`/admin/announcements/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new HttpError(
      `PATCH /admin/announcements/${id} failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as Announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/admin/announcements/${id}`), {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `DELETE /admin/announcements/${id} failed: HTTP ${res.status}`,
      res.status,
    );
  }
}

// --- announcements (일반 유저) ---

// 활성 + 기간 매치 + 나에게 노출되는 공지 전부. 읽음 시점은 readAt에 담김
// (null=미읽음). 인박스 스타일 렌더에 사용.
export async function getMyAnnouncements(): Promise<UserAnnouncement[]> {
  const res = await fetch(apiUrl('/announcements'), {
    cache: 'no-store',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `GET /announcements failed: HTTP ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as UserAnnouncement[];
}

export async function markAnnouncementRead(id: string): Promise<void> {
  const res = await fetch(apiUrl(`/announcements/${id}/read`), {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new HttpError(
      `POST /announcements/${id}/read failed: HTTP ${res.status}`,
      res.status,
    );
  }
}
