import {
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

// Owner-scoped question pool. Each user gets their own copy of the curated
// seed on onboarding (see profiles.service.upsertMe) — mirrors the
// company_types / blog_sources pattern. Custom user-added questions land in
// the same table in a later phase.
export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull(),
  content: text('content').notNull(),
  answer: text('answer').notNull(),
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
