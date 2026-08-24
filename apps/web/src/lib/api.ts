import type {
  ApplicationStatus,
  Company,
  CompanyType1,
  CompanyType2,
  DayNote,
  Exercise,
  ExerciseStats,
  PreviousWorkout,
  Priority,
  RoutineCheck,
  TimeBlock,
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
  patch: Partial<Pick<TimeBlock, 'label' | 'sortOrder' | 'isArchived' | 'startTime' | 'endTime'>>,
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

// --- workouts ---

export async function getExercises(includeArchived = false): Promise<Exercise[]> {
  const qs = includeArchived ? '?includeArchived=true' : '';
  const res = await fetch(`${API_BASE}/exercises${qs}`, { cache: 'no-store' });
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
  const res = await fetch(`${API_BASE}/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /exercises failed: HTTP ${res.status}`);
  return (await res.json()) as Exercise;
}

export async function patchExercise(
  id: string,
  patch: Partial<Pick<Exercise, 'name' | 'targetMuscle' | 'defaultSets' | 'repMin' | 'repMax' | 'sortOrder' | 'isArchived'>>,
): Promise<Exercise> {
  const res = await fetch(`${API_BASE}/exercises/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /exercises/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as Exercise;
}

// Returns null when no session exists for this date.
export async function getWorkoutSessionByDate(date: string): Promise<WorkoutSession | null> {
  const qs = new URLSearchParams({ date });
  const res = await fetch(`${API_BASE}/workout-sessions?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET /workout-sessions failed: HTTP ${res.status}`);
  const arr = (await res.json()) as WorkoutSession[];
  return arr[0] ?? null;
}

export async function getWorkoutSessionsRange(range: {
  from: string;
  to: string;
}): Promise<WorkoutSession[]> {
  const qs = new URLSearchParams({ from: range.from, to: range.to });
  const res = await fetch(`${API_BASE}/workout-sessions?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET /workout-sessions failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession[];
}

export async function createWorkoutSession(input: {
  date: string;
  note?: string;
}): Promise<WorkoutSession> {
  const res = await fetch(`${API_BASE}/workout-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`POST /workout-sessions failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession;
}

export async function patchWorkoutSession(
  id: string,
  patch: { note?: string | null },
): Promise<WorkoutSession> {
  const res = await fetch(`${API_BASE}/workout-sessions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH /workout-sessions/${id} failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSession;
}

export async function getWorkoutSets(sessionId: string): Promise<WorkoutSet[]> {
  const qs = new URLSearchParams({ sessionId });
  const res = await fetch(`${API_BASE}/workout-sets?${qs.toString()}`, {
    cache: 'no-store',
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
  const res = await fetch(`${API_BASE}/workout-sets/batch`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`PUT /workout-sets/batch failed: HTTP ${res.status}`);
  return (await res.json()) as WorkoutSet[];
}

export async function getExerciseStats(params: {
  exerciseId: string;
  limit?: number;
}): Promise<ExerciseStats> {
  const qs = new URLSearchParams({ exerciseId: params.exerciseId });
  if (params.limit !== undefined) qs.set('limit', String(params.limit));
  const res = await fetch(`${API_BASE}/workout-sets/exercise-stats?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET /workout-sets/exercise-stats failed: HTTP ${res.status}`);
  return (await res.json()) as ExerciseStats;
}

// --- export (backup) ---

// Returns the raw JSON text so the caller can hand it straight to a Blob
// without re-serializing (and losing any nuance in Postgres numeric strings,
// timestamp formatting, etc.).
export async function getExportJson(): Promise<string> {
  const res = await fetch(`${API_BASE}/export`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`GET /export failed: HTTP ${res.status}`);
  return await res.text();
}

export async function getPreviousWorkout(params: {
  exerciseId: string;
  beforeDate: string;
}): Promise<PreviousWorkout | null> {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/workout-sets/previous?${qs.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET /workout-sets/previous failed: HTTP ${res.status}`);
  // Nest serializes `null` return as an empty body (Content-Length: 0) rather
  // than the string "null", so res.json() would throw. Read as text first.
  const text = await res.text();
  return text ? (JSON.parse(text) as PreviousWorkout) : null;
}
