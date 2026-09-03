import { Injectable, Logger } from '@nestjs/common';
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

  async findAll(query: QueryBlogPostsDto) {
    const conditions: SQL[] = [];
    if (query.sourceId) conditions.push(eq(blogPosts.sourceId, query.sourceId));

    // published_at이 null이면 뒤로 밀어서 정렬 (NULLS LAST). 그다음 created_at 최신순.
    return db
      .select()
      .from(blogPosts)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${blogPosts.publishedAt} DESC NULLS LAST`, desc(blogPosts.createdAt))
      .limit(query.limit ?? DEFAULT_LIMIT)
      .offset(query.offset ?? 0);
  }

  async refresh(): Promise<RefreshResult> {
    const sources = await db
      .select()
      .from(blogSources)
      .where(eq(blogSources.isActive, true));

    let added = 0;
    const errors: RefreshResult['errors'] = [];

    for (const source of sources) {
      try {
        const items = await fetchRssItems(source.rssUrl);
        if (items.length === 0) continue;

        // onConflictDoNothing으로 신규만 삽입. 반환된 row 수가 실제 added.
        const inserted = await db
          .insert(blogPosts)
          .values(
            items.map((it) => ({
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
}
