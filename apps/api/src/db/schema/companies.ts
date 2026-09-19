import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  date,
  timestamp,
} from 'drizzle-orm/pg-core';

export const companyType1Enum = pgEnum('company_type_1', [
  'big_tech',
  'sme',
  'startup',
  'foreign',
  'public',
]);

// company_type_2 was previously a Postgres enum; it's now a plain text column
// backed by the user-editable `company_types` table (see company-types.ts).
// Kept as text (not FK) so removing a type from the list doesn't touch
// existing companies — they retain the value they were assigned.

export const priorityEnum = pgEnum('priority', [
  'important',
  'normal',
  'urgent',
]);

export const employmentTypeEnum = pgEnum('employment_type', [
  'intern_to_regular',
  'full_time',
  'contract',
  'etc',
]);

export const applicationStatusEnum = pgEnum('application_status', [
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
]);

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Owner (Phase 12.4). FK to auth.users(id) ON DELETE CASCADE added via
  // raw SQL in migration 0011 (Drizzle doesn't know Supabase's auth schema).
  ownerId: uuid('owner_id').notNull(),

  name: text('name').notNull(),
  type1: companyType1Enum('type1').notNull(),
  type2: text('type2').notNull(),
  priority: priorityEnum('priority').notNull().default('normal'),
  isHiring: boolean('is_hiring').notNull().default(false),
  isFavorite: boolean('is_favorite').notNull().default(false),
  note: text('note'),
  postingUrl: text('posting_url'),

  employmentType: employmentTypeEnum('employment_type'),
  applicationDeadline: timestamp('application_deadline', {
    withTimezone: true,
    mode: 'string',
  }),
  applicationStatus: applicationStatusEnum('application_status')
    .notNull()
    .default('not_applied'),
  appliedAt: date('applied_at'),
  // 상시채용(rolling): 고정 마감일 없이 계속 뽑는 공고. true면
  // applicationDeadline은 서비스 레이어에서 null로 강제되고, D-1/D-3 알림 ·
  // 오늘 마감 카운트 · 놓친 공고 통계에서 제외됨.
  isRolling: boolean('is_rolling').notNull().default(false),
  applicationDocUrl: text('application_doc_url'),
  progressNote: text('progress_note'),

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
