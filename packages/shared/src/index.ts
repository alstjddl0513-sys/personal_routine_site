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
  isRolling: boolean;
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

// 사용자 알림 설정. localStorage와 profiles.preferences JSONB 양쪽에
// 동일 shape로 저장. workoutSkip.skipDays는 3/5/7/14 중 하나(운동 없이
// N일 지나면 알림).
export interface WorkoutSkipPreferences {
  enabled: boolean;
  skipDays: number;
}

export interface NotifPreferences {
  master: boolean;
  morningSummary: boolean;
  deadline: boolean;
  routineEvening: boolean;
  workoutSkip: WorkoutSkipPreferences;
}

export interface Preferences {
  notif: NotifPreferences;
}

// 신규 계정/미마이그 사용자를 위한 시드값. 클라 localStorage 기본값과
// 반드시 일치시켜야 sync 로직이 성립.
export const DEFAULT_PREFERENCES: Preferences = {
  notif: {
    master: true,
    morningSummary: true,
    deadline: true,
    routineEvening: true,
    workoutSkip: { enabled: true, skipDays: 3 },
  },
};

export interface Profile {
  id: string;
  nickname: string;
  preferences: Preferences;
  createdAt: string;
  updatedAt: string;
  // Phase 12.5: env `ADMIN_USER_IDS` 매치 시 true. UI(사이드바 어드민 링크)
  // 조건부 렌더에 사용. 클라에서 재검증 불가하므로 서버 진리치.
  isAdmin: boolean;
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
  /** question_categories.key. 카테고리 미지정/삭제됨 케이스는 null. */
  categoryKey: string | null;
  status: QuestionStatus | null;
}

// Full detail (fetched when the user asks to see the answer).
export interface QuestionDetail {
  id: string;
  content: string;
  answer: string;
  /** 답을 열어본 뒤 이어질 만한 꼬리 질문 1~2개 (선택). 없으면 null. */
  tip: string | null;
  categoryKey: string | null;
  log: QuestionLog | null;
}

// 관리 페이지에서 사용하는 full-shape 질문. daily/review에서 쓰는
// RandomQuestion(경량)과 별개로, /settings/questions 리스트/편집이 필요로 하는
// answer/tip까지 함께 반환.
export interface Question {
  id: string;
  content: string;
  answer: string;
  tip: string | null;
  categoryKey: string | null;
  createdAt: string;
  updatedAt: string;
}

// 학습 질문 카테고리 (사용자 커스터마이징 가능). 프론트는 API에서 목록을 가져와
// chip 필터와 설정 매니저에 사용.
export interface QuestionCategory {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
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

// --- documents (이력서·포폴·외부 링크) ---

export const DOCUMENT_KIND_VALUES = ['resume', 'portfolio', 'link'] as const;
export type DocumentKind = (typeof DOCUMENT_KIND_VALUES)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  resume: '이력서',
  portfolio: '포폴',
  link: '외부 링크',
};

export interface Document {
  id: string;
  kind: DocumentKind;
  title: string;
  storagePath: string | null;
  url: string | null;
  fileSize: number | null;
  fileMime: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// 파일 업로드 2단계 흐름: (1) InitDocumentInput POST → 서버가 Supabase Storage
// signed upload URL 발급 + DB row insert (2) 클라가 반환된 uploadUrl에 PUT.
// 링크는 이 흐름 안 씀 (createLinkDocument 별도 호출).
export interface InitDocumentInput {
  kind: 'resume' | 'portfolio';
  title: string;
  fileName: string;
  fileSize: number;
  fileMime: string;
}

export interface InitDocumentResult {
  document: Document;
  uploadUrl: string;
  token: string;
  path: string;
}

// UI/DTO 검증에 재사용. Storage 버킷은 50MB 통일, 앱 레벨에서 kind별 분리.
export const DOCUMENT_MAX_BYTES: Record<'resume' | 'portfolio', number> = {
  resume: 10 * 1024 * 1024,
  portfolio: 50 * 1024 * 1024,
};

export const DOCUMENT_ALLOWED_MIME = ['application/pdf'] as const;

// --- admin (Phase 12.5) ---

export const ANNOUNCEMENT_KINDS = ['notice', 'update', 'maintenance', 'event'] as const;
export type AnnouncementKind = (typeof ANNOUNCEMENT_KINDS)[number];

export const ANNOUNCEMENT_KIND_LABELS: Record<AnnouncementKind, string> = {
  notice: '공지',
  update: '업데이트',
  maintenance: '점검',
  event: '이벤트',
};

export interface Announcement {
  id: string;
  kind: AnnouncementKind;
  title: string;
  body: string;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  // 빈 배열 = 전체 유저 대상 (어드민 응답에만 채워지고, 일반 유저 응답에선
  // 항상 빈 배열로 보내 개인정보 누출 방지)
  targetUserIds: string[];
}

// 일반 유저 관점의 공지. 읽음 시점(`readAt`) 포함해서 인박스 스타일로 표시.
// 어드민이 isActive=false 하거나 기간을 지나기 전까진 읽어도 목록에 남아서
// 언제든 다시 볼 수 있음. 뱃지 카운트는 `readAt === null` 갯수.
export interface UserAnnouncement extends Announcement {
  readAt: string | null;
}

// 어드민이 CRUD할 때 사용. targetUserIds가 undefined 또는 빈 배열이면 전체
// 대상. 명시적으로 지정하면 announcement_targets에 upsert.
export interface CreateAnnouncementInput {
  kind: AnnouncementKind;
  title: string;
  body: string;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  targetUserIds?: string[];
}
export type UpdateAnnouncementInput = Partial<CreateAnnouncementInput>;

// 어드민 사용자 목록 row. auth.users + profiles LEFT JOIN.
// isAdmin은 env `ADMIN_USER_IDS` 매치. UI에서 뱃지 표시 + 차단/삭제 버튼
// 숨김에 사용. 백엔드도 같은 판정으로 self-lockout · admin 상호 무력화 방지.
export interface AdminUserRow {
  id: string;
  email: string | null;
  nickname: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  isAdmin: boolean;
}

export interface AdminUsersPage {
  page: number;
  perPage: number;
  total: number;
  users: AdminUserRow[];
}

// 인앱 피드백. 유저가 /settings에서 보내는 자유 텍스트 + 카테고리.
// user_id/path/version/created_at은 서버·클라가 자동 첨부. 편집·삭제 없음.
export const FEEDBACK_CATEGORIES = ['bug', 'suggestion', 'other'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: '버그',
  suggestion: '제안',
  other: '기타',
};

export interface Feedback {
  id: string;
  userId: string;
  category: FeedbackCategory;
  body: string;
  page: string | null;
  version: string | null;
  createdAt: string;
}

export interface CreateFeedbackInput {
  category: FeedbackCategory;
  body: string;
  page?: string;
  version?: string;
}

// 어드민 조회. profiles(닉네임) + auth.users(email)와 조인해서 함께 반환.
export interface AdminFeedback extends Feedback {
  nickname: string | null;
  email: string | null;
}

// 어드민 개요 대시보드용 집계. Supabase auth.users의 created_at / last_sign_in_at
// 만으로 계산 (별도 로그 테이블 X). last_sign_in_at은 토큰 발급 시점 기준이라
// "실질 활동"과 100% 일치하진 않지만 MVP 지표로 충분.
export interface AdminStatsOverview {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  signups7d: number;
  signups30d: number;
  generatedAt: string;
}

// 1일 · 7일 · 30일 · 100년(=사실상 영구). Supabase가 ban_duration을
// `<n>h` 형식으로 받음. 100년 = 24*365*100 = 876000시간.
export const BAN_DURATION_HOURS = [24, 168, 720, 876000] as const;
export type BanDurationHours = (typeof BAN_DURATION_HOURS)[number];

export const BAN_DURATION_LABELS: Record<BanDurationHours, string> = {
  24: '1일',
  168: '7일',
  720: '30일',
  876000: '영구',
};
