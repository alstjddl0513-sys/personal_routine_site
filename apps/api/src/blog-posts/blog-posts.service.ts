import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { and, desc, eq, SQL, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { blogPosts, blogSources } from '../db/schema';
import type { QueryBlogPostsDto } from './dto/query-blog-posts.dto';
import { fetchRssItems } from './rss-fetcher';

export interface RefreshResult {
  processed: number;
  added: number;
  errors: { sourceId: string; name: string; message: string }[];
}

const DEFAULT_LIMIT = 50;

@Injectable()
export class BlogPostsService {
  private readonly logger = new Logger(BlogPostsService.name);

  async findAll(ownerId: string, query: QueryBlogPostsDto) {
    const conditions: SQL[] = [eq(blogPosts.ownerId, ownerId)];
    if (query.sourceId) conditions.push(eq(blogPosts.sourceId, query.sourceId));

    // published_at이 null이면 뒤로 밀어서 정렬 (NULLS LAST). 그다음 created_at 최신순.
    return db
      .select()
      .from(blogPosts)
      .where(and(...conditions))
      .orderBy(sql`${blogPosts.publishedAt} DESC NULLS LAST`, desc(blogPosts.createdAt))
      .limit(query.limit ?? DEFAULT_LIMIT)
      .offset(query.offset ?? 0);
  }

  // Refresh active sources' feeds. When `ownerId` is provided (HTTP call from
  // a signed-in user) only that user's sources are touched. When omitted
  // (scheduled cron), every user's active sources are refreshed. Each fetched
  // post is stamped with the parent source's owner_id so denormalized filters
  // stay consistent.
  async refresh(ownerId?: string): Promise<RefreshResult> {
    const conditions: SQL[] = [eq(blogSources.isActive, true)];
    if (ownerId) conditions.push(eq(blogSources.ownerId, ownerId));

    const sources = await db
      .select()
      .from(blogSources)
      .where(and(...conditions));

    let added = 0;
    const errors: RefreshResult['errors'] = [];

    for (const source of sources) {
      try {
        const items = await fetchRssItems(source.rssUrl);
        if (items.length === 0) continue;

        // onConflictDoNothing으로 신규만 삽입. 반환된 row 수가 실제 added.
        // commit D에서 blog_posts.url UNIQUE를 (owner_id, url) composite로 바꿈 —
        // 그 전까진 전역 URL unique라 다른 유저가 이미 수집한 글은 skip됨.
        const inserted = await db
          .insert(blogPosts)
          .values(
            items.map((it) => ({
              ownerId: source.ownerId,
              sourceId: source.id,
              title: it.title,
              url: it.url,
              summary: it.summary,
              publishedAt: it.publishedAt,
            })),
          )
          .onConflictDoNothing({ target: blogPosts.url })
          .returning({ id: blogPosts.id });

        added += inserted.length;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`RSS refresh failed for ${source.name}: ${message}`);
        errors.push({ sourceId: source.id, name: source.name, message });
      }
    }

    return { processed: sources.length, added, errors };
  }

  // 서버 프로세스 안에서 하루 2회 자동 refresh. 08:00 / 20:00 KST = 23:00 / 11:00 UTC.
  // Render 무료 티어는 15분 idle 시 슬립하므로, 외부 health ping이 서버를 깨워두는
  // 것이 이 cron이 미스되지 않기 위한 전제 (deployment.md §5 참고).
  //
  // No user context — refreshes every user's active sources. Each post gets
  // stamped with the parent source's owner_id in `refresh()`.
  @Cron('0 11,23 * * *')
  async scheduledRefresh() {
    this.logger.log('Scheduled RSS refresh starting…');
    const result = await this.refresh();
    if (result.errors.length > 0) {
      this.logger.warn(
        `Scheduled refresh done: added=${result.added}, errors=${result.errors.length}/${result.processed}`,
      );
    } else {
      this.logger.log(
        `Scheduled refresh done: added=${result.added}, processed=${result.processed}`,
      );
    }
  }
}
