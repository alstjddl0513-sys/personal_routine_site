export type HealthResponse = {
  status: 'ok';
  db: 'ok' | 'error';
};

// --- companies ---

export const COMPANY_TYPE_1_VALUES = [
  'big_tech',
  'sme',
  'startup',
  'foreign',
  'public',
] as const;
export type CompanyType1 = (typeof COMPANY_TYPE_1_VALUES)[number];

// company_type_2는 user-editable로 이관됨 (company_types 테이블).
// 프론트는 CompanyType 리스트를 API에서 가져와 사용.
export interface CompanyType {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PRIORITY_VALUES = ['important', 'normal', 'urgent'] as const;
export type Priority = (typeof PRIORITY_VALUES)[number];

export const EMPLOYMENT_TYPE_VALUES = [
  'intern_to_regular',
  'full_time',
  'contract',
  'etc',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPE_VALUES)[number];

export const APPLICATION_STATUS_VALUES = [
  'not_applied',
  'applied',
  'document_passed',
  'document_failed',
  'interview_1_passed',
  'interview_1_failed',
  'interview_2_passed',
  'interview_2_failed',
  'final_passed',
  'final_failed',
  'withdrawn',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUS_VALUES)[number];

export interface Company {
  id: string;
  name: string;
  type1: CompanyType1;
  type2: string;
  priority: Priority;
  isHiring: boolean;
  isFavorite: boolean;
  note: string | null;
  postingUrl: string | null;
  employmentType: EmploymentType | null;
  applicationDeadline: string | null;
  applicationStatus: ApplicationStatus;
  appliedAt: string | null;
  applicationDocUrl: string | null;
  progressNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export const COMPANY_TYPE_1_LABELS: Record<CompanyType1, string> = {
  big_tech: '대기업',
  sme: '중소',
  startup: '스타트업',
  foreign: '외국계',
  public: '공공',
};

// COMPANY_TYPE_2_LABELS는 user-editable로 이관되어 제거됨.
// 프론트는 CompanyType[].label을 사용.

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: '긴급',
  important: '상',
  normal: '하',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  intern_to_regular: '인턴→전환',
  full_time: '정규직',
  contract: '계약직',
  etc: '기타',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  not_applied: '미지원',
  applied: '지원',
  document_passed: '서류합격',
  document_failed: '서류탈락',
  interview_1_passed: '1차합격',
  interview_1_failed: '1차탈락',
  interview_2_passed: '2차합격',
  interview_2_failed: '2차탈락',
  final_passed: '최종합격',
  final_failed: '최종탈락',
  withdrawn: '지원취소',
};

// --- routines ---

export interface TimeBlock {
  id: string;
  label: string;
  /** Minutes from midnight (0..1410, step 30). null when unset. */
  startTime: number | null;
  /** Minutes from midnight. null for single-time blocks; must be > startTime when set. */
  endTime: number | null;
  sortOrder: number;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineCheck {
  blockId: string;
  date: string;
}

export interface DayNote {
  date: string;
  content: string;
  updatedAt: string;
}

// --- workouts ---

export interface Exercise {
  id: string;
  name: string;
  targetMuscle: string | null;
  defaultSets: number;
  repMin: number;
  repMax: number;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  date: string;
  note: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  /** numeric(6,2) returned as string by pg. parseFloat on the client. */
  weightKg: string | null;
  reps: number | null;
  rir: number | null;
  createdAt: string;
}

export interface PreviousWorkout {
  date: string;
  sets: Pick<WorkoutSet, 'setNumber' | 'weightKg' | 'reps' | 'rir'>[];
}

export interface ExerciseStatsHistoryEntry {
  sessionDate: string;
  /** numeric(6,2) returned as string. parseFloat on the client. */
  topWeightKg: string;
  topReps: number | null;
}

export interface ExerciseStatsPR {
  /** numeric(6,2) returned as string. parseFloat on the client. */
  weightKg: string;
  reps: number | null;
  sessionDate: string;
}

export interface ExerciseStats {
  history: ExerciseStatsHistoryEntry[];
  pr: ExerciseStatsPR | null;
}

export interface WorkoutHeatmapEntry {
  date: string;
  completedExerciseCount: number;
}

export interface WeeklyVolumeEntry {
  /** ISO date of Monday of that week. */
  weekStart: string;
  /** Sum of weight_kg × reps for "complete" sets in that week. */
  volumeKg: number;
}

// 부위별 주간 세트 목표 (Phase workouts/muscle-goals).
// muscleKey는 MUSCLE_OPTIONS.key와 매치 (등/가슴/어깨/팔/다리).
export interface MuscleGoal {
  id: string;
  muscleKey: string;
  weeklySetTarget: number;
  createdAt: string;
  updatedAt: string;
}

// 부위별 완전 세트(weightKg AND reps 둘 다 있는) 카운트.
export interface MuscleSetCountEntry {
  /** target_muscle from exercises; nullable when exercise has none. */
  muscleKey: string | null;
  setCount: number;
}

// 온보딩 시드 & UI 목표 편집 default. (owner_id는 서버에서 스탬프)
export const DEFAULT_MUSCLE_GOALS: readonly {
  muscleKey: string;
  weeklySetTarget: number;
}[] = [
  { muscleKey: 'back', weeklySetTarget: 10 },
  { muscleKey: 'chest', weeklySetTarget: 10 },
  { muscleKey: 'shoulder', weeklySetTarget: 10 },
  { muscleKey: 'arm', weeklySetTarget: 8 },
  { muscleKey: 'leg', weeklySetTarget: 12 },
];

// --- blog ---

export interface BlogSource {
  id: string;
  name: string;
  rssUrl: string;
  siteUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  sourceId: string;
  title: string;
  url: string;
  summary: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface BlogRefreshResult {
  processed: number;
  added: number;
  errors: { sourceId: string; name: string; message: string }[];
}

// --- profiles ---

export interface Profile {
  id: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface NicknameAvailability {
  available: boolean;
}

// --- learn (CS questions) ---

export const QUESTION_STATUS_VALUES = ['understood', 'review_needed'] as const;
export type QuestionStatus = (typeof QUESTION_STATUS_VALUES)[number];

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  understood: '이해완료',
  review_needed: '복습필요',
};

export interface QuestionLog {
  status: QuestionStatus;
  answeredAt: string;
  updatedAt: string;
}

// Random-question response: content only + optional prior status.
export interface RandomQuestion {
  id: string;
  content: string;
  status: QuestionStatus | null;
}

// Full detail (fetched when the user asks to see the answer).
export interface QuestionDetail {
  id: string;
  content: string;
  answer: string;
  log: QuestionLog | null;
}

export interface QuestionHeatmapEntry {
  date: string;
  count: number;
}

export interface QuestionStatsSummary {
  total: number;
  understood: number;
  reviewNeeded: number;
}
