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
  // Owner (Phase 12.4). See companies.ts for the auth.users FK note.
  ownerId: uuid('owner_id'),
  label: text('label').notNull(),
  startTime: smallint('start_time'),
  endTime: smallint('end_time'),
  sortOrder: integer('sort_order').notNull(),
  isArchived: boolean('is_archived').notNull().default(false),
  // Set alongside isArchived so the calendar view can reconstruct which blocks
  // were live on a past date (createdAt <= D and (archivedAt is null or archivedAt >= D)).
  archivedAt: timestamp('archived_at', { withTimezone: true }),
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
    // Owner (Phase 12.4). Denormalized copy of timeBlocks.ownerId — the app
    // layer must set this to the parent block's owner on insert.
    ownerId: uuid('owner_id'),
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
  // Owner (Phase 12.4). See companies.ts for the auth.users FK note.
  ownerId: uuid('owner_id'),
  // UNIQUE(date) is relaxed to UNIQUE(owner_id, date) in Phase 12.4 commit D
  // so different users can each note the same date.
  date: date('date').notNull().unique(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
