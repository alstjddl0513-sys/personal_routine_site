import {
  boolean,
  date,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// start_time / end_time stored as minutes-from-midnight (0..1410, step 30).
// Both nullable: start-only blocks render as "7:00", ranges as "8:30~11:30".
// end_time must be > start_time when both present (enforced app-side).
export const timeBlocks = pgTable('time_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  label: text('label').notNull(),
  startTime: smallint('start_time'),
  endTime: smallint('end_time'),
  sortOrder: integer('sort_order').notNull(),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Row existence = the block was checked on that date.
// Uncheck deletes the row. Keeps the schema minimal for MVP.
export const routineChecks = pgTable(
  'routine_checks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    blockId: uuid('block_id')
      .notNull()
      .references(() => timeBlocks.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('routine_checks_block_date_uq').on(t.blockId, t.date)],
);

export const dayNotes = pgTable('day_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull().unique(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
