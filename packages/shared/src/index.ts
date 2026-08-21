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

export const COMPANY_TYPE_2_VALUES = [
  'service',
  'solution',
  'si',
  'inhouse',
  'lab',
  'freelance',
] as const;
export type CompanyType2 = (typeof COMPANY_TYPE_2_VALUES)[number];

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
  type2: CompanyType2;
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

export const COMPANY_TYPE_2_LABELS: Record<CompanyType2, string> = {
  service: '서비스',
  solution: '솔루션',
  si: 'SI',
  inhouse: '인하우스',
  lab: '랩',
  freelance: '프리랜서',
};

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
  sortOrder: number;
  isArchived: boolean;
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
