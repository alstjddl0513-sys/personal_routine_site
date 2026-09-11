import { Injectable, NotFoundException } from '@nestjs/common';
import { and, between, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { routineChecks, timeBlocks } from '../db/schema';
import type { QueryRangeDto } from './dto/query-range.dto';
import type { ToggleCheckDto } from './dto/toggle-check.dto';

@Injectable()
export class RoutineChecksService {
  async findRange(ownerId: string, query: QueryRangeDto) {
    const rows = await db
      .select({
        blockId: routineChecks.blockId,
        date: routineChecks.date,
      })
      .from(routineChecks)
      .where(
        and(
          eq(routineChecks.ownerId, ownerId),
          between(routineChecks.date, query.from, query.to),
        ),
      );
    return rows;
  }

  async toggle(ownerId: string, dto: ToggleCheckDto) {
    if (dto.checked) {
      // Verify the target block belongs to this user before inserting a
      // denormalized owner_id — otherwise a caller could stamp their id
      // onto someone else's block. 404-shaped so we don't leak existence.
      const [block] = await db
        .select({ id: timeBlocks.id })
        .from(timeBlocks)
        .where(
          and(eq(timeBlocks.id, dto.blockId), eq(timeBlocks.ownerId, ownerId)),
        )
        .limit(1);
      if (!block) throw new NotFoundException(`TimeBlock ${dto.blockId} not found`);

      // Idempotent insert: if already checked, do nothing.
      await db
        .insert(routineChecks)
        .values({ ownerId, blockId: dto.blockId, date: dto.date })
        .onConflictDoNothing({
          target: [routineChecks.blockId, routineChecks.date],
        });
    } else {
      await db
        .delete(routineChecks)
        .where(
          and(
            eq(routineChecks.ownerId, ownerId),
            eq(routineChecks.blockId, dto.blockId),
            sql`${routineChecks.date} = ${dto.date}`,
          ),
        );
    }
    return { blockId: dto.blockId, date: dto.date, checked: dto.checked };
  }
}
