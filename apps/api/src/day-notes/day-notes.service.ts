import { BadRequestException, Injectable } from '@nestjs/common';
import { asc, between, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { dayNotes } from '../db/schema';
import type { QueryRangeDto } from './dto/query-range.dto';
import type { UpsertDayNoteDto } from './dto/upsert-day-note.dto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class DayNotesService {
  async findRange(query: QueryRangeDto) {
    return db
      .select({
        date: dayNotes.date,
        content: dayNotes.content,
        updatedAt: dayNotes.updatedAt,
      })
      .from(dayNotes)
      .where(between(dayNotes.date, query.from, query.to))
      .orderBy(asc(dayNotes.date));
  }

  async upsert(date: string, dto: UpsertDayNoteDto) {
    if (!DATE_RE.test(date)) {
      throw new BadRequestException('date must be YYYY-MM-DD');
    }
    // Treat empty/whitespace as "clear the note".
    const content = dto.content.trim();
    if (content.length === 0) {
      await db.delete(dayNotes).where(eq(dayNotes.date, date));
      return { date, content: '' };
    }
    const [row] = await db
      .insert(dayNotes)
      .values({ date, content })
      .onConflictDoUpdate({
        target: dayNotes.date,
        set: { content, updatedAt: new Date() },
      })
      .returning({
        date: dayNotes.date,
        content: dayNotes.content,
        updatedAt: dayNotes.updatedAt,
      });
    return row;
  }
}
