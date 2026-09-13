import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, ne, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { questionLogs, questions } from '../db/schema';
import type { LogQuestionDto } from './dto/log-question.dto';
import type { QueryRandomDto } from './dto/query-random.dto';

@Injectable()
export class QuestionsService {
  // Random question WITHOUT the answer — the client fetches the answer via
  // findOne when the user clicks "답 보기". Prev status is included so the
  // client can hint "이미 봤음" without a second round trip.
  async findRandom(ownerId: string, query: QueryRandomDto) {
    const conditions: SQL[] = [eq(questions.ownerId, ownerId)];
    if (query.exclude) conditions.push(ne(questions.id, query.exclude));
    const [row] = await db
      .select({
        id: questions.id,
        content: questions.content,
        status: questionLogs.status,
      })
      .from(questions)
      .leftJoin(
        questionLogs,
        and(
          eq(questionLogs.questionId, questions.id),
          eq(questionLogs.ownerId, ownerId),
        ),
      )
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(1);
    if (!row) throw new NotFoundException('No questions available');
    return row;
  }

  // Full detail (answer + user's log). Ownership check via the same WHERE.
  async findOne(ownerId: string, id: string) {
    const [row] = await db
      .select({
        id: questions.id,
        content: questions.content,
        answer: questions.answer,
        status: questionLogs.status,
        answeredAt: questionLogs.answeredAt,
        updatedAt: questionLogs.updatedAt,
      })
      .from(questions)
      .leftJoin(
        questionLogs,
        and(
          eq(questionLogs.questionId, questions.id),
          eq(questionLogs.ownerId, ownerId),
        ),
      )
      .where(and(eq(questions.id, id), eq(questions.ownerId, ownerId)))
      .limit(1);
    if (!row) throw new NotFoundException(`Question ${id} not found`);
    return {
      id: row.id,
      content: row.content,
      answer: row.answer,
      log:
        row.status && row.answeredAt && row.updatedAt
          ? {
              status: row.status,
              answeredAt: row.answeredAt,
              updatedAt: row.updatedAt,
            }
          : null,
    };
  }

  // Upsert on UNIQUE(owner_id, question_id). Ownership of the question is
  // verified explicitly since FK alone doesn't enforce owner match.
  async upsertLog(ownerId: string, questionId: string, dto: LogQuestionDto) {
    const [q] = await db
      .select({ id: questions.id })
      .from(questions)
      .where(and(eq(questions.id, questionId), eq(questions.ownerId, ownerId)))
      .limit(1);
    if (!q) throw new NotFoundException(`Question ${questionId} not found`);

    const [row] = await db
      .insert(questionLogs)
      .values({ ownerId, questionId, status: dto.status })
      .onConflictDoUpdate({
        target: [questionLogs.ownerId, questionLogs.questionId],
        set: { status: dto.status, updatedAt: new Date() },
      })
      .returning({
        status: questionLogs.status,
        answeredAt: questionLogs.answeredAt,
        updatedAt: questionLogs.updatedAt,
      });
    return row;
  }
}
