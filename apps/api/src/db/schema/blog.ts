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
  // Owner (Phase 12.4). See companies.ts for the auth.users FK note.
  ownerId: uuid('owner_id'),
  name: text('name').notNull(),
  // UNIQUE(rss_url) is relaxed to UNIQUE(owner_id, rss_url) in commit D so
  // two users can each subscribe to the same feed.
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
  // Owner (Phase 12.4). Denormalized copy of blogSources.ownerId — the app
  // layer (rss-fetcher) must set this to the source's owner on insert.
  ownerId: uuid('owner_id'),
  sourceId: uuid('source_id')
    .notNull()
    .references(() => blogSources.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  // UNIQUE(url) is relaxed to UNIQUE(owner_id, url) in commit D so different
  // users can each have their own copy of the same post.
  url: text('url').notNull().unique(),
  summary: text('summary'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
