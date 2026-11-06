import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
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
  // Owner (Phase 12.4). See companies.ts for the auth.users FK note.
  ownerId: uuid('owner_id').notNull(),
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

// 분할(스플릿): 이름 + 종목 목록 + 순서. 요일 고정이 아니라 sort_order 순서대로
// 돌아가며 함("지난번 상체 A → 오늘은 하체 A 차례"). 부위와 무관 — 같은 하체라도
// 종목만 다른 "하체 A/B" 가능. 분할을 안 만든 유저는 기존처럼 전체 종목.
export const workoutSplits = pgTable(
  'workout_splits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Owner. See companies.ts for the auth.users FK note (raw SQL in migration).
    ownerId: uuid('owner_id').notNull(),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('workout_splits_owner_order_idx').on(t.ownerId, t.sortOrder)],
);

// M2M: 분할 ↔ 종목. 한 종목이 여러 분할에 들어갈 수 있음. 카드 순서는 종목의
// sort_order를 그대로 따름(분할 안 순서는 따로 두지 않음).
export const workoutSplitExercises = pgTable(
  'workout_split_exercises',
  {
    splitId: uuid('split_id')
      .notNull()
      .references(() => workoutSplits.id, { onDelete: 'cascade' }),
    exerciseId: uuid('exercise_id')
      .notNull()
      .references(() => exercises.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.splitId, t.exerciseId] }),
    index('wse_exercise_idx').on(t.exerciseId),
  ],
);

// 하루 여러 세션 허용 (분할 훈련 대응). date는 그냥 index 대상.
export const workoutSessions = pgTable('workout_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Owner (Phase 12.4). See companies.ts for the auth.users FK note.
  ownerId: uuid('owner_id').notNull(),
  date: date('date').notNull(),
  note: text('note'),
  // 그날 한 분할 — 다음 차례 계산용. 분할을 지워도 기록은 남게 SET NULL.
  splitId: uuid('split_id').references(() => workoutSplits.id, {
    onDelete: 'set null',
  }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
  endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 부위별 주간 세트 목표. muscle_key는 MUSCLE_OPTIONS.key와 매치 (등/가슴/…).
// exercises.target_muscle과 마찬가지로 FK 없이 text — 나중에 부위 추가/삭제해도
// 기존 goal row에 영향 없음. (owner, key) unique로 upsert.
export const muscleGoals = pgTable(
  'muscle_goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Owner (Phase 12.4). See companies.ts for the auth.users FK note.
    ownerId: uuid('owner_id').notNull(),
    muscleKey: text('muscle_key').notNull(),
    weeklySetTarget: smallint('weekly_set_target').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('muscle_goals_owner_muscle_uq').on(t.ownerId, t.muscleKey)],
);

// 세트 단위 기록. weight_kg는 numeric(6,2) — Postgres에서 string으로 반환되므로
// 프론트에서 parseFloat 필요. 이력 보존 위해 exercise FK는 restrict.
export const workoutSets = pgTable(
  'workout_sets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Owner (Phase 12.4). Denormalized copy of workoutSessions.ownerId — the
    // app layer must set this to the parent session's owner on insert.
    ownerId: uuid('owner_id').notNull(),
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
