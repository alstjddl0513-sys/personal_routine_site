import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const questionStatusEnum = pgEnum('question_status', [
  'understood',
  'review_needed',
]);

// User-editable list of question categories (CS 기초/네트워크/…). Mirrors the
// company_types pattern: owner-scoped, key stored on questions.category_key
// as plain text (no FK) so deleting a category preserves existing question
// data — it just disappears from the chip filter.
export const questionCategories = pgTable(
  'question_categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    key: text('key').notNull(),
    label: text('label').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('question_categories_owner_key_uq').on(t.ownerId, t.key)],
);

// Owner-scoped question pool. Each user gets their own copy of the curated
// seed on onboarding (see profiles.service.upsertMe) — mirrors the
// company_types / blog_sources pattern. Custom user-added questions land in
// the same table in a later phase.
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  content: text('content').notNull(),
  answer: text('answer').notNull(),
  // 답을 열어본 뒤 이어서 나올 만한 꼬리 질문 1~2개. 면접 flow 훈련 용도.
  // 서식 자유 (줄바꿈으로 구분 권장). 기존 질문은 null이었다가 시드 갱신으로 채워짐.
  tip: text('tip'),
  // question_categories.key와 매칭. FK 없음(company_types와 동일 이유):
  // 카테고리 삭제 시 questions 데이터는 유지되고 chip에서만 사라짐.
  categoryKey: text('category_key'),
  // profiles.upsertMe 온보딩 시드나 seed-questions.ts로 넣은 큐레이션 문항이면 true.
  // 사용자가 POST /questions로 직접 추가한 커스텀은 false. /settings/questions는
  // false만 노출(시드 노이즈 회피). daily/review pool은 무관하게 전체 사용.
  isSeed: boolean('is_seed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One log per (owner, question). Re-answering flips status via upsert
// instead of appending a new row — repeat-history is out of scope for MVP.
export const questionLogs = pgTable(
  'question_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id').notNull(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    status: questionStatusEnum('status').notNull(),
    answeredAt: timestamp('answered_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('question_logs_owner_question_uq').on(t.ownerId, t.questionId),
  ],
);
