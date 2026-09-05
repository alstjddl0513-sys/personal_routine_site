import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, max, SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { blogSources } from '../db/schema';
import type { CreateBlogSourceDto } from './dto/create-blog-source.dto';
import type { UpdateBlogSourceDto } from './dto/update-blog-source.dto';
import type { QueryBlogSourcesDto } from './dto/query-blog-sources.dto';

@Injectable()
export class BlogSourcesService {
  async findAll(query: QueryBlogSourcesDto) {
    const conditions: SQL[] = [];
    if (query.isActive !== undefined) {
      conditions.push(eq(blogSources.isActive, query.isActive));
    }
    return db
      .select()
      .from(blogSources)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(blogSources.sortOrder), asc(blogSources.createdAt));
  }

  async findOne(id: string) {
    const [row] = await db
      .select()
      .from(blogSources)
      .where(eq(blogSources.id, id))
      .limit(1);
    if (!row) throw new NotFoundException(`BlogSource ${id} not found`);
    return row;
  }

  async create(dto: CreateBlogSourceDto) {
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const [{ maxOrder }] = await db
        .select({ maxOrder: max(blogSources.sortOrder) })
        .from(blogSources);
      sortOrder = (maxOrder ?? -1) + 1;
    }
    const [row] = await db
      .insert(blogSources)
      .values({
        name: dto.name,
        rssUrl: dto.rssUrl,
        siteUrl: dto.siteUrl,
        isActive: dto.isActive ?? true,
        sortOrder,
      })
      .returning();
    return row;
  }

  async update(id: string, dto: UpdateBlogSourceDto) {
    const [row] = await db
      .update(blogSources)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(blogSources.id, id))
      .returning();
    if (!row) throw new NotFoundException(`BlogSource ${id} not found`);
    return row;
  }

  async remove(id: string) {
    const [row] = await db
      .delete(blogSources)
      .where(eq(blogSources.id, id))
      .returning({ id: blogSources.id });
    if (!row) throw new NotFoundException(`BlogSource ${id} not found`);
    return { id: row.id };
  }
}
