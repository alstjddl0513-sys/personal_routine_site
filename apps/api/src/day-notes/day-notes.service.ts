import { BadRequestException, Injectable } from '@nestjs/common';
import { and, asc, between, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { dayNotes } from '../db/schema';
import type { QueryRangeDto } from './dto/query-range.dto';
import type { UpsertDayNoteDto } from './dto/upsert-day-note.dto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class DayNotesService {
  async findRange(ownerId: string, query: QueryRangeDto) {
    return db
      .select({
        date: dayNotes.date,
        content: dayNotes.content,
        updatedAt: dayNotes.updatedAt,
      })
      .from(dayNotes)
      .where(
        and(
          eq(dayNotes.ownerId, ownerId),
          between(dayNotes.date, query.from, query.to),
        ),
      )
      .orderBy(asc(dayNotes.date));
  }

  async upsert(ownerId: string, date: string, dto: UpsertDayNoteDto) {
    if (!DATE_RE.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    // Treat empty/whitespace as "clear the note".
    const content = dto.content.trim();
    if (content.length === 0) {
      await db
        .delete(dayNotes)
        .where(and(eq(dayNotes.ownerId, ownerId), eq(dayNotes.date, date)));
      return { date, content: '' };
    }
    // Manual upsert. `date` is currently UNIQUE globally — commit D swaps
    // it to UNIQUE(owner_id, date) so a proper INSERT..ON CONFLICT (owner_id, date)
    // works. Until then, look up + branch to avoid tripping the global unique.
    const [existing] = await db
      .select({ id: dayNotes.id })
      .from(dayNotes)
      .where(and(eq(dayNotes.ownerId, ownerId), eq(dayNotes.date, date)))
      .limit(1);

    if (existing) {
      const [row] = await db
        .update(dayNotes)
        .set({ content, updatedAt: new Date() })
        .where(and(eq(dayNotes.ownerId, ownerId), eq(dayNotes.date, date)))
        .returning({
          date: dayNotes.date,
          content: dayNotes.content,
          updatedAt: dayNotes.updatedAt,
        });
      return row;
    }
    const [row] = await db
      .insert(dayNotes)
      .values({ ownerId, date, content })
      .returning({
        date: dayNotes.date,
        content: dayNotes.content,
        updatedAt: dayNotes.updatedAt,
      });
    return row;
  }
}
