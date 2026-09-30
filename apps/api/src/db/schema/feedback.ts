import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// 유저가 /settings에서 보내는 인앱 피드백. 편집·삭제 UI 없이 immutable.
// user_id FK to auth.users(id) ON DELETE CASCADE + RLS는 마이그 raw SQL에서 부여.
// 어드민은 postgres role로 접근하므로 RLS bypass. NestJS AdminGuard로 접근 통제.
export const feedbackCategoryEnum = pgEnum('feedback_category', [
  'bug',
  'suggestion',
  'other',
]);

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    category: feedbackCategoryEnum('category').notNull(),
    body: text('body').notNull(),
    // 클라이언트가 usePathname()으로 채움. 서버는 저장만.
    page: text('page'),
    // 클라이언트 앱 버전 (예: '1.1.5'). 회귀 원인 좁힐 때 유용.
    version: text('version'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('feedback_created_at_idx').on(t.createdAt),
    index('feedback_user_id_idx').on(t.userId),
  ],
);
