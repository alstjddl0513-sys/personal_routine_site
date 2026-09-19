import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core';

// Phase 12.5. 어드민이 사용자에게 띄우는 공지. Kind로 아이콘/색 분류,
// starts_at/ends_at으로 활성 기간 지정, announcement_targets 조인 테이블로
// 특정 유저만 타겟팅 가능(0개 row = 전체 유저 대상).
//
// RLS는 마이그 raw SQL에서 부여. auth.users FK도 마찬가지.
// INSERT/UPDATE/DELETE 정책은 두지 않아 authenticated는 못 씀 —
// NestJS(postgres role)만 관리. announcement_targets는 SELECT 정책도 없어
// 개인정보(누구에게 보냈나) 누출 방지.

export const announcementKindEnum = pgEnum('announcement_kind', [
  'notice',
  'update',
  'maintenance',
  'event',
]);

export const announcements = pgTable(
  'announcements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    kind: announcementKindEnum('kind').notNull().default('notice'),
    title: text('title').notNull(),
    body: text('body').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    // null이면 즉시 시작 / 무제한. 서비스 레이어와 RLS SELECT 정책 모두
    // 기간 매치 필터를 건다.
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('announcements_active_window_idx').on(
      t.isActive,
      t.startsAt,
      t.endsAt,
      t.createdAt,
    ),
  ],
);

// 타겟 지정. 0개 row = 전체 유저 대상. 1개 이상 = 지정 유저만.
export const announcementTargets = pgTable(
  'announcement_targets',
  {
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.announcementId, t.userId] }),
    index('announcement_targets_user_idx').on(t.userId),
  ],
);

// 사용자가 종 아이콘 드로어에서 공지 클릭 시 upsert.
export const announcementReads = pgTable(
  'announcement_reads',
  {
    userId: uuid('user_id').notNull(),
    announcementId: uuid('announcement_id')
      .notNull()
      .references(() => announcements.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.announcementId] }),
    index('announcement_reads_user_idx').on(t.userId),
  ],
);
