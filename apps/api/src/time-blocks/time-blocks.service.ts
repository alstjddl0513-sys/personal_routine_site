import { Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq, max } from 'drizzle-orm';
import { db } from '../db/client';
import { timeBlocks } from '../db/schema';
import type { CreateTimeBlockDto } from './dto/create-time-block.dto';
import type { UpdateTimeBlockDto } from './dto/update-time-block.dto';
import type { QueryTimeBlocksDto } from './dto/query-time-blocks.dto';

@Injectable()
export class TimeBlocksService {
  async findAll(query: QueryTimeBlocksDto) {
    const q = db.select().from(timeBlocks).orderBy(asc(timeBlocks.sortOrder));
    if (query.includeArchived) {
      return q;
    }
    return q.where(eq(timeBlocks.isArchived, false));
  }

  async create(dto: CreateTimeBlockDto) {
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const [{ maxOrder }] = await db
        .select({ maxOrder: max(timeBlocks.sortOrder) })
        .from(timeBlocks);
      sortOrder = (maxOrder ?? -1) + 1;
    }
    const [row] = await db
      .insert(timeBlocks)
      .values({ label: dto.label, sortOrder })
      .returning();
    return row;
  }

  async update(id: string, dto: UpdateTimeBlockDto) {
    const [row] = await db
      .update(timeBlocks)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(timeBlocks.id, id))
      .returning();
    if (!row) {
      throw new NotFoundException(`TimeBlock ${id} not found`);
    }
    return row;
  }

  // Soft delete: calendar view reconstructs past active-block counts from
  // createdAt/archivedAt, so the row must be preserved.
  async remove(id: string) {
    const now = new Date();
    const [row] = await db
      .update(timeBlocks)
      .set({ isArchived: true, archivedAt: now, updatedAt: now })
      .where(eq(timeBlocks.id, id))
      .returning({ id: timeBlocks.id });
    if (!row) {
      throw new NotFoundException(`TimeBlock ${id} not found`);
    }
    return { id: row.id };
  }
}
