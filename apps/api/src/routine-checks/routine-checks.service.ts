import { Injectable } from '@nestjs/common';
import { and, between, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { routineChecks } from '../db/schema';
import type { QueryRangeDto } from './dto/query-range.dto';
import type { ToggleCheckDto } from './dto/toggle-check.dto';

@Injectable()
export class RoutineChecksService {
  async findRange(query: QueryRangeDto) {
    const rows = await db
      .select({
        blockId: routineChecks.blockId,
        date: routineChecks.date,
      })
      .from(routineChecks)
      .where(between(routineChecks.date, query.from, query.to));
    return rows;
  }

  async toggle(dto: ToggleCheckDto) {
    if (dto.checked) {
      // Idempotent insert: if already checked, do nothing.
      await db
        .insert(routineChecks)
        .values({ blockId: dto.blockId, date: dto.date })
        .onConflictDoNothing({
          target: [routineChecks.blockId, routineChecks.date],
        });
    } else {
      await db
        .delete(routineChecks)
        .where(
          and(
            eq(routineChecks.blockId, dto.blockId),
            sql`${routineChecks.date} = ${dto.date}`,
          ),
        );
    }
    return { blockId: dto.blockId, date: dto.date, checked: dto.checked };
  }
}
