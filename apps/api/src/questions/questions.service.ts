import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, eq, gte, lte, ne, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { questionLogs, questions } from '../db/schema';
import type { LogQuestionDto } from './dto/log-question.dto';
import type { QueryRandomDto } from './dto/query-random.dto';
import type { QueryStatsRangeDto } from './dto/query-stats-range.dto';

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

  // Daily activity counts for the heatmap. Groups by updated_at::date so
  // re-answering a question moves its activity to today's bucket (review
  // also counts as learning). Empty days omitted; client fills with 0.
  // AT TIME ZONE 'UTC' pins the date extraction to UTC regardless of
  // server tz drift.
  async getHeatmap(ownerId: string, query: QueryStatsRangeDto) {
    const rows = await db
      .select({
        date: sql<string>`(${questionLogs.updatedAt} AT TIME ZONE 'UTC')::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(questionLogs)
      .where(
        and(
          eq(questionLogs.ownerId, ownerId),
          gte(sql`(${questionLogs.updatedAt} AT TIME ZONE 'UTC')::date`, query.from),
          lte(sql`(${questionLogs.updatedAt} AT TIME ZONE 'UTC')::date`, query.to),
        ),
      )
      .groupBy(sql`(${questionLogs.updatedAt} AT TIME ZONE 'UTC')::date`)
      .orderBy(sql`(${questionLogs.updatedAt} AT TIME ZONE 'UTC')::date`);
    return rows;
  }

  // Aggregate counts. UNIQUE(owner, question) means one log per question,
  // so total = understood + reviewNeeded.
  async getSummary(ownerId: string) {
    const [logAgg] = await db
      .select({
        understood: sql<number>`sum(case when ${questionLogs.status} = 'understood' then 1 else 0 end)::int`,
        reviewNeeded: sql<number>`sum(case when ${questionLogs.status} = 'review_needed' then 1 else 0 end)::int`,
      })
      .from(questionLogs)
      .where(eq(questionLogs.ownerId, ownerId));
    const [poolAgg] = await db
      .select({ total: count() })
      .from(questions)
      .where(eq(questions.ownerId, ownerId));
    const understood = logAgg?.understood ?? 0;
    const reviewNeeded = logAgg?.reviewNeeded ?? 0;
    return {
      total: understood + reviewNeeded,
      understood,
      reviewNeeded,
      totalPool: poolAgg?.total ?? 0,
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
