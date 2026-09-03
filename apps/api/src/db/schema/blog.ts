import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// 수집 대상 RSS 소스. 사용자가 UI로 추가/편집.
export const blogSources = pgTable('blog_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  rssUrl: text('rss_url').notNull().unique(),
  siteUrl: text('site_url'),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// 수집된 글. url을 중복 방지 키로 사용 → 재수집해도 신규만 insert.
// 소스 삭제 시 관련 글도 함께 정리(cascade).
export const blogPosts = pgTable('blog_posts', {
  id: uuid('id').defaultRandom().primaryKey(),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => blogSources.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull().unique(),
  summary: text('summary'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
