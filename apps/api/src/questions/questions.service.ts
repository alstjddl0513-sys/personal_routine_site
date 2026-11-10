import { Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import { db } from '../db/client';
import { questionLogEvents, questionLogs, questions } from '../db/schema';
import type { QuestionStatus } from '@repo/shared';
import type { CreateQuestionDto } from './dto/create-question.dto';
import type { FavoriteQuestionDto } from './dto/favorite-question.dto';
import type { LogQuestionDto } from './dto/log-question.dto';
import type { QueryDailyDto } from './dto/query-daily.dto';
import type { QueryFavoritesDto } from './dto/query-favorites.dto';
import type { QueryQuestionsDto } from './dto/query-questions.dto';
import type { QueryRandomDto } from './dto/query-random.dto';
import type { QueryReviewDto } from './dto/query-review.dto';
import type { QueryStatsRangeDto } from './dto/query-stats-range.dto';
import type { UpdateQuestionDto } from './dto/update-question.dto';

const DAILY_LIMIT = 5;

@Injectable()
export class QuestionsService {
  // Today's 10-question set, deterministic by (owner_id, date). md5 of
  // `question.id || date` gives a per-day pseudo-random ordering; the top 10
  // are today's set. Same day → same 10 (refresh-safe). Different day → new
  // 10. No storage; if we ever need "show me yesterday's set" this becomes
  // a table lookup.
  //
  // 질문당 기록은 1개(마지막 상태)라 그대로 쓰면 예전에 표시한 질문이 오늘 '이미 한 것'으로
  // 떠서, 5개가 다 예전 질문이면 하나도 안 풀었는데 '오늘 완료'가 됨. 그래서:
  //  - status는 오늘(서울, query.date) 표시한 것만 — 이전 날 표시는 null
  //  - 어제까지 이해완료한 질문은 뒤로(안 푼 질문·복습필요가 먼저, 모자라면 채움).
  //    오늘 표시해도 앞 묶음 안에서만 움직여 하루 안 5개 구성은 그대로
  async findDaily(ownerId: string, query: QueryDailyDto) {
    const conditions: SQL[] = [eq(questions.ownerId, ownerId)];
    if (query.categories && query.categories.length > 0) {
      conditions.push(inArray(questions.categoryKey, query.categories));
    }
    const logDay = sql`(${questionLogs.updatedAt} AT TIME ZONE 'Asia/Seoul')::date`;
    return db
      .select({
        id: questions.id,
        content: questions.content,
        categoryKey: questions.categoryKey,
        status: sql<QuestionStatus | null>`case when ${logDay} = ${query.date}::date then ${questionLogs.status} else null end`,
        isFavorite: questions.isFavorite,
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
      .orderBy(
        sql`case when ${questionLogs.status} = 'understood' and ${logDay} < ${query.date}::date then 1 else 0 end`,
        sql`md5(${questions.id}::text || ${query.date})`,
      )
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
        isFavorite: questions.isFavorite,
        // 복습 카드 "11월 2일에 표시" — 복습필요로 표시한 날(서울)
        markedAt: sql<string>`(${questionLogs.updatedAt} AT TIME ZONE 'Asia/Seoul')::date::text`,
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

  // 별표(is_favorite=true)만. status와 무관하게 이해완료된 것도 포함. 정렬은
  // updated_at DESC (최근 별표 or 최근 답변한 것부터). categories chip 필터 지원.
  async findFavorites(ownerId: string, query: QueryFavoritesDto) {
    const conditions: SQL[] = [
      eq(questions.ownerId, ownerId),
      eq(questions.isFavorite, true),
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
        isFavorite: questions.isFavorite,
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
      .orderBy(desc(questions.updatedAt));
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
        isFavorite: questions.isFavorite,
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
        isFavorite: questions.isFavorite,
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
      isFavorite: row.isFavorite,
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

  // 날짜별 학습한 질문 수(히트맵·스트릭·'오늘 학습'). 표시할 때마다 쌓는 question_log_events 기준 —
  // question_logs(질문당 1행)로 세면 다시 표시할 때 예전 날짜가 덮여 지난 기록이 줄었음.
  // 같은 날 같은 질문을 여러 번 바꿔도 1개(질문을 지워도 기록의 question_id는 남음 — FK 없음).
  // 서울 날짜 기준(국내 사용자). 빈 날은 빠짐 → 클라가 0으로 채움.
  async getHeatmap(ownerId: string, query: QueryStatsRangeDto) {
    const day = sql`(${questionLogEvents.createdAt} AT TIME ZONE 'Asia/Seoul')::date`;
    return db
      .select({
        date: sql<string>`${day}::text`,
        count: sql<number>`count(distinct ${questionLogEvents.questionId})::int`,
      })
      .from(questionLogEvents)
      .where(
        and(
          eq(questionLogEvents.ownerId, ownerId),
          gte(day, query.from),
          lte(day, query.to),
        ),
      )
      .groupBy(day)
      .orderBy(day);
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

  // 관리 페이지용 list. 사용자가 직접 추가한 커스텀 질문(is_seed=false)만.
  // 시드 풀은 프로덕션에서 커질 수 있어 관리 화면에는 노출하지 않음. daily/review
  // pool은 여전히 시드+커스텀 전부 사용.
  async findAllForOwner(ownerId: string, query: QueryQuestionsDto) {
    const conditions: SQL[] = [
      eq(questions.ownerId, ownerId),
      eq(questions.isSeed, false),
    ];
    if (query.categories && query.categories.length > 0) {
      conditions.push(inArray(questions.categoryKey, query.categories));
    }
    return db
      .select({
        id: questions.id,
        content: questions.content,
        answer: questions.answer,
        tip: questions.tip,
        categoryKey: questions.categoryKey,
        isFavorite: questions.isFavorite,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
      })
      .from(questions)
      .where(and(...conditions))
      .orderBy(desc(questions.createdAt));
  }

  async create(ownerId: string, dto: CreateQuestionDto) {
    const [row] = await db
      .insert(questions)
      .values({
        ownerId,
        content: dto.content,
        answer: dto.answer,
        tip: dto.tip ?? null,
        categoryKey: dto.categoryKey ?? null,
      })
      .returning({
        id: questions.id,
        content: questions.content,
        answer: questions.answer,
        tip: questions.tip,
        categoryKey: questions.categoryKey,
        isFavorite: questions.isFavorite,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
      });
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateQuestionDto) {
    // is_seed=true 는 관리 UI에서 노출도 안 되고 수정도 못함(시드 drift 방지).
    // 클라이언트가 임의 id로 PATCH해도 404로 응답.
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.answer !== undefined) patch.answer = dto.answer;
    if (dto.tip !== undefined) patch.tip = dto.tip ?? null;
    if (dto.categoryKey !== undefined)
      patch.categoryKey = dto.categoryKey ?? null;

    const [row] = await db
      .update(questions)
      .set(patch)
      .where(
        and(
          eq(questions.id, id),
          eq(questions.ownerId, ownerId),
          eq(questions.isSeed, false),
        ),
      )
      .returning({
        id: questions.id,
        content: questions.content,
        answer: questions.answer,
        tip: questions.tip,
        categoryKey: questions.categoryKey,
        isFavorite: questions.isFavorite,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
      });
    if (!row) throw new NotFoundException(`Question ${id} not found`);
    return row;
  }

  // 별표 토글. is_seed 체크 없이 소유권만 검사 — 시드 질문에도 붙일 수 있게.
  // questions.updated_at 갱신으로 favorites 페이지가 최근 별표 순으로 정렬됨.
  // review 페이지 정렬은 questionLogs.updated_at 기반이라 영향 없음.
  async setFavorite(ownerId: string, id: string, dto: FavoriteQuestionDto) {
    const [row] = await db
      .update(questions)
      .set({ isFavorite: dto.isFavorite, updatedAt: new Date() })
      .where(and(eq(questions.id, id), eq(questions.ownerId, ownerId)))
      .returning({ id: questions.id, isFavorite: questions.isFavorite });
    if (!row) throw new NotFoundException(`Question ${id} not found`);
    return row;
  }

  async remove(ownerId: string, id: string) {
    // is_seed=true 는 삭제 불가 (update와 동일 정책). question_logs FK CASCADE로
    // 관련 log는 자동 정리.
    const [row] = await db
      .delete(questions)
      .where(
        and(
          eq(questions.id, id),
          eq(questions.ownerId, ownerId),
          eq(questions.isSeed, false),
        ),
      )
      .returning({ id: questions.id });
    if (!row) throw new NotFoundException(`Question ${id} not found`);
    return { id: row.id };
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

    // 지금 상태(question_logs 1행) + 표시 기록 한 줄(question_log_events)을 한 번에 — 통계 날짜는 기록 쪽
    return db.transaction(async (tx) => {
      const [row] = await tx
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
      await tx
        .insert(questionLogEvents)
        .values({ ownerId, questionId, status: dto.status });
      return row;
    });
  }
}
