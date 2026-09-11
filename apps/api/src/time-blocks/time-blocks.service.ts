import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, max } from 'drizzle-orm';
import { db } from '../db/client';
import { timeBlocks } from '../db/schema';
import type { CreateTimeBlockDto } from './dto/create-time-block.dto';
import type { UpdateTimeBlockDto } from './dto/update-time-block.dto';
import type { QueryTimeBlocksDto } from './dto/query-time-blocks.dto';

@Injectable()
export class TimeBlocksService {
  async findAll(ownerId: string, query: QueryTimeBlocksDto) {
    const q = db
      .select()
      .from(timeBlocks)
      .orderBy(asc(timeBlocks.sortOrder));
    if (query.includeArchived) {
      return q.where(eq(timeBlocks.ownerId, ownerId));
    }
    return q.where(
      and(eq(timeBlocks.ownerId, ownerId), eq(timeBlocks.isArchived, false)),
    );
  }

  async create(ownerId: string, dto: CreateTimeBlockDto) {
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const [{ maxOrder }] = await db
        .select({ maxOrder: max(timeBlocks.sortOrder) })
        .from(timeBlocks)
        .where(eq(timeBlocks.ownerId, ownerId));
      sortOrder = (maxOrder ?? -1) + 1;
    }
    const [row] = await db
      .insert(timeBlocks)
      .values({
        ownerId,
        label: dto.label,
        sortOrder,
        startTime: dto.startTime,
        endTime: dto.endTime,
      })
      .returning();
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateTimeBlockDto) {
    const [row] = await db
      .update(timeBlocks)
      .set({ ...dto, updatedAt: new Date() })
      .where(and(eq(timeBlocks.id, id), eq(timeBlocks.ownerId, ownerId)))
      .returning();
    if (!row) {
      throw new NotFoundException(`TimeBlock ${id} not found`);
    }
    return row;
  }

  // Soft delete: calendar view reconstructs past active-block counts from
  // createdAt/archivedAt, so the row must be preserved.
  async remove(ownerId: string, id: string) {
    const now = new Date();
    const [row] = await db
      .update(timeBlocks)
      .set({ isArchived: true, archivedAt: now, updatedAt: now })
      .where(and(eq(timeBlocks.id, id), eq(timeBlocks.ownerId, ownerId)))
      .returning({ id: timeBlocks.id });
    if (!row) {
      throw new NotFoundException(`TimeBlock ${id} not found`);
    }
    return { id: row.id };
  }
}
