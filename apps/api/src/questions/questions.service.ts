import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte, inArray, lte, ne, sql, type SQL } from 'drizzle-orm';
import { db } from '../db/client';
import { questionLogs, questions } from '../db/schema';
import type { LogQuestionDto } from './dto/log-question.dto';
import type { QueryDailyDto } from './dto/query-daily.dto';
import type { QueryRandomDto } from './dto/query-random.dto';
import type { QueryReviewDto } from './dto/query-review.dto';
import type { QueryStatsRangeDto } from './dto/query-stats-range.dto';

const DAILY_LIMIT = 5;

@Injectable()
export class QuestionsService {
  // Today's 10-question set, deterministic by (owner_id, date). md5 of
  // `question.id || date` gives a per-day pseudo-random ordering; the top 10
  // are today's set. Same day → same 10 (refresh-safe). Different day → new
  // 10. No storage; if we ever need "show me yesterday's set" this becomes
  // a table lookup.
  async findDaily(ownerId: string, query: QueryDailyDto) {
    const conditions: SQL[] = [eq(questions.ownerId, ownerId)];
    if (query.categories && query.categories.length > 0) {
      conditions.push(inArray(questions.categoryKey, query.categories));
    }
    return db
      .select({
        id: questions.id,
        content: questions.content,
        categoryKey: questions.categoryKey,
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
      .orderBy(sql`md5(${questions.id}::text || ${query.date})`)
      .limit(DAILY_LIMIT);
  }

  // '복습필요'로 마킹된 질문들. 정렬은 updated_at ASC — 오래 표시된 질문일수록
  // 잊혀질 위험이 크다는 spaced-repetition 직관. 재답변으로 updated_at이 갱신되면
  // 자연스럽게 리스트 뒤로 밀림. Response shape는 findDaily와 동일하게 유지해
  // LearnCard가 그대로 재사용됨.
  async findReview(ownerId: string, query: QueryReviewDto) {
    const conditions: SQL[] = [
      eq(questions.ownerId, ownerId),
      eq(questionLogs.status, 'review_needed'),
    ];
    if (query.categories && query.categories.length > 0) {
      conditions.push(inArray(questions.categoryKey, query.categories));
    }
    return db
      .select({
        id: questions.id,
        content: questions.content,
        categoryKey: questions.categoryKey,
        status: questionLogs.status,
      })
      .from(questions)
      .innerJoin(
        questionLogs,
        and(
          eq(questionLogs.questionId, questions.id),
          eq(questionLogs.ownerId, ownerId),
        ),
      )
      .where(and(...conditions))
      .orderBy(asc(questionLogs.updatedAt));
  }

  // Random question WITHOUT the answer — kept for potential admin/debug use.
  // The /learn UI uses findDaily instead as of Phase 13.1 daily-quota rework.
  async findRandom(ownerId: string, query: QueryRandomDto) {
    const conditions: SQL[] = [eq(questions.ownerId, ownerId)];
    if (query.exclude) conditions.push(ne(questions.id, query.exclude));
    const [row] = await db
      .select({
        id: questions.id,
        content: questions.content,
        categoryKey: questions.categoryKey,
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

  // Full detail (answer + tip + user's log). Ownership check via the same WHERE.
  async findOne(ownerId: string, id: string) {
    const [row] = await db
      .select({
        id: questions.id,
        content: questions.content,
        answer: questions.answer,
        tip: questions.tip,
        categoryKey: questions.categoryKey,
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
      tip: row.tip,
      categoryKey: row.categoryKey,
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

  // Daily activity counts for the heatmap. Groups by updated_at date in
  // Asia/Seoul (Rally is Korean-audience) so a KST-morning answer lands on
  // today rather than yesterday-UTC. Re-answering moves activity to today's
  // bucket (review also counts as learning). Empty days omitted; client
  // fills with 0. Hardcoded Seoul is a known limitation — revisit if
  // internationalizing.
  async getHeatmap(ownerId: string, query: QueryStatsRangeDto) {
    const rows = await db
      .select({
        date: sql<string>`(${questionLogs.updatedAt} AT TIME ZONE 'Asia/Seoul')::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(questionLogs)
      .where(
        and(
          eq(questionLogs.ownerId, ownerId),
          gte(sql`(${questionLogs.updatedAt} AT TIME ZONE 'Asia/Seoul')::date`, query.from),
          lte(sql`(${questionLogs.updatedAt} AT TIME ZONE 'Asia/Seoul')::date`, query.to),
        ),
      )
      .groupBy(sql`(${questionLogs.updatedAt} AT TIME ZONE 'Asia/Seoul')::date`)
      .orderBy(sql`(${questionLogs.updatedAt} AT TIME ZONE 'Asia/Seoul')::date`);
    return rows;
  }

  // Aggregate counts. UNIQUE(owner, question) means one log per question,
  // so total = understood + reviewNeeded. totalPool was removed — the ratio
  // (answered / pool) loses meaning as the question pool grows; absolute
  // count is more honest at scale.
  async getSummary(ownerId: string) {
    const [logAgg] = await db
      .select({
        understood: sql<number>`sum(case when ${questionLogs.status} = 'understood' then 1 else 0 end)::int`,
        reviewNeeded: sql<number>`sum(case when ${questionLogs.status} = 'review_needed' then 1 else 0 end)::int`,
      })
      .from(questionLogs)
      .where(eq(questionLogs.ownerId, ownerId));
    const understood = logAgg?.understood ?? 0;
    const reviewNeeded = logAgg?.reviewNeeded ?? 0;
    return {
      total: understood + reviewNeeded,
      understood,
      reviewNeeded,
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
