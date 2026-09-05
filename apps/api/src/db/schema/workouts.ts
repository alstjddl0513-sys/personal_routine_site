import {
  boolean,
  date,
  integer,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

// 운동 종목 마스터. 이력 보존을 위해 하드 삭제 대신 is_archived 사용을 권장.
// FK from workout_sets는 restrict라 세트가 있으면 DELETE 실패.
export const exercises = pgTable('exercises', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  targetMuscle: text('target_muscle'),
  defaultSets: smallint('default_sets').notNull().default(3),
  repMin: smallint('rep_min').notNull(),
  repMax: smallint('rep_max').notNull(),
  sortOrder: integer('sort_order').notNull(),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 하루 여러 세션 허용 (분할 훈련 대응). date는 그냥 index 대상.
export const workoutSessions = pgTable('workout_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull(),
  note: text('note'),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
  endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 세트 단위 기록. weight_kg는 numeric(6,2) — Postgres에서 string으로 반환되므로
// 프론트에서 parseFloat 필요. 이력 보존 위해 exercise FK는 restrict.
export const workoutSets = pgTable(
  'workout_sets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'restrict' }),
    setNumber: smallint('set_number').notNull(),
    weightKg: numeric('weight_kg', { precision: 6, scale: 2 }),
    reps: smallint('reps'),
    rir: smallint('rir'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('workout_sets_session_exercise_set_uq').on(
      t.sessionId,
      t.exerciseId,
      t.setNumber,
    ),
  ],
);
