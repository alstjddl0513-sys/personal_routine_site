import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  MAX_ACTIVE_CHALLENGES,
  type RoutineChallengeWithProgress,
} from '@repo/shared';
import { db } from '../db/client';
import {
  routineChallengeBlocks,
  routineChallenges,
  routineChecks,
  timeBlocks,
} from '../db/schema';
import type { CreateChallengeDto } from './dto/create-challenge.dto';
import type { QueryChallengesDto } from './dto/query-challenges.dto';
import type { UpdateChallengeDto } from './dto/update-challenge.dto';

@Injectable()
export class RoutineChallengesService {
  // 챌린지 리스트 + 각 챌린지의 success_days 계산 + target 도달 시 자동 completed 전환.
  async findAll(
    ownerId: string,
    query: QueryChallengesDto,
  ): Promise<RoutineChallengeWithProgress[]> {
    const conds = [eq(routineChallenges.ownerId, ownerId)];
    if (query.status) {
      conds.push(eq(routineChallenges.status, query.status));
    }

    const rows = await db
      .select()
      .from(routineChallenges)
      .where(and(...conds))
      .orderBy(desc(routineChallenges.createdAt));

    if (rows.length === 0) return [];

    // 모든 챌린지의 block 매핑 1번에 조회.
    const challengeIds = rows.map((r) => r.id);
    const blockLinks = await db
      .select({
        challengeId: routineChallengeBlocks.challengeId,
        blockId: routineChallengeBlocks.blockId,
      })
      .from(routineChallengeBlocks)
      .where(inArray(routineChallengeBlocks.challengeId, challengeIds));

    const blocksByChallenge = new Map<string, string[]>();
    for (const l of blockLinks) {
      const arr = blocksByChallenge.get(l.challengeId);
      if (arr) arr.push(l.blockId);
      else blocksByChallenge.set(l.challengeId, [l.blockId]);
    }

    const today = isoToday();

    const results: RoutineChallengeWithProgress[] = [];
    const toMarkCompleted: string[] = [];

    for (const r of rows) {
      const blockIds = blocksByChallenge.get(r.id) ?? [];
      let successDays = 0;
      if (blockIds.length > 0) {
        successDays = await this.countSuccessDays(
          ownerId,
          blockIds,
          r.startDate,
          today,
        );
      }

      const remainingDays = r.targetDays - successDays;

      // active인데 성공 일수가 target 달성했으면 자동 completed로 업데이트 예약.
      let status = r.status;
      let completedAt = r.completedAt;
      if (status === 'active' && successDays >= r.targetDays) {
        status = 'completed';
        completedAt = new Date();
        toMarkCompleted.push(r.id);
      }

      results.push({
        id: r.id,
        title: r.title,
        startDate: r.startDate,
        targetDays: r.targetDays,
        blockIds,
        status,
        completedAt:
          completedAt instanceof Date
            ? completedAt.toISOString()
            : (completedAt as unknown as string | null),
        abandonedAt: r.abandonedAt as unknown as string | null,
        createdAt: r.createdAt as unknown as string,
        updatedAt: r.updatedAt as unknown as string,
        successDays,
        remainingDays,
      });
    }

    // 자동 completed 전환 persist (fire-and-forget 아님 — 응답 전에 완료).
    if (toMarkCompleted.length > 0) {
      await db
        .update(routineChallenges)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(routineChallenges.ownerId, ownerId),
            inArray(routineChallenges.id, toMarkCompleted),
          ),
        );
    }

    return results;
  }

  // 성공 일수 = start_date~today 범위에서 "모든 blockIds가 체크된 날"의 수.
  // 체크 count per date = blockIds.length면 성공.
  private async countSuccessDays(
    ownerId: string,
    blockIds: string[],
    startDate: string,
    today: string,
  ): Promise<number> {
    // today < startDate면 0 (아직 시작 전).
    if (today < startDate) return 0;

    // 그룹바이 쿼리: date별 체크된 unique block_id 수.
    const rows = await db
      .select({
        date: routineChecks.date,
        checkedCount: sql<number>`COUNT(DISTINCT ${routineChecks.blockId})`.as(
          'checked_count',
        ),
      })
      .from(routineChecks)
      .where(
        and(
          eq(routineChecks.ownerId, ownerId),
          inArray(routineChecks.blockId, blockIds),
          gte(routineChecks.date, startDate),
          lte(routineChecks.date, today),
        ),
      )
      .groupBy(routineChecks.date);

    // 모든 블록 체크된 날만.
    return rows.filter((r) => Number(r.checkedCount) >= blockIds.length).length;
  }

  async create(ownerId: string, dto: CreateChallengeDto) {
    // 활성 챌린지 개수 상한 체크 (완료/포기는 제외).
    const [{ activeCount }] = await db
      .select({ activeCount: count() })
      .from(routineChallenges)
      .where(
        and(
          eq(routineChallenges.ownerId, ownerId),
          eq(routineChallenges.status, 'active'),
        ),
      );
    if (Number(activeCount) >= MAX_ACTIVE_CHALLENGES) {
      throw new BadRequestException(
        `진행 중 챌린지는 최대 ${MAX_ACTIVE_CHALLENGES}개까지 가능합니다.`,
      );
    }

    // 소유권 검증: blockIds 전부가 유저 소유인지.
    const owned = await db
      .select({ id: timeBlocks.id })
      .from(timeBlocks)
      .where(
        and(
          eq(timeBlocks.ownerId, ownerId),
          inArray(timeBlocks.id, dto.blockIds),
        ),
      );
    if (owned.length !== dto.blockIds.length) {
      throw new BadRequestException(
        '일부 블록이 존재하지 않거나 소유자가 다릅니다.',
      );
    }

    // 챌린지 insert + junction insert.
    const [challenge] = await db
      .insert(routineChallenges)
      .values({
        ownerId,
        title: dto.title,
        startDate: dto.startDate,
        targetDays: dto.targetDays,
      })
      .returning();

    await db.insert(routineChallengeBlocks).values(
      dto.blockIds.map((blockId) => ({
        challengeId: challenge.id,
        blockId,
      })),
    );

    return {
      ...challenge,
      blockIds: dto.blockIds,
    };
  }

  async update(ownerId: string, id: string, dto: UpdateChallengeDto) {
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.status !== undefined) {
      patch.status = dto.status;
      if (dto.status === 'abandoned') patch.abandonedAt = new Date();
    }
    const [row] = await db
      .update(routineChallenges)
      .set(patch)
      .where(
        and(
          eq(routineChallenges.id, id),
          eq(routineChallenges.ownerId, ownerId),
        ),
      )
      .returning();
    if (!row) {
      throw new NotFoundException(`Challenge ${id} not found`);
    }
    const links = await db
      .select({ blockId: routineChallengeBlocks.blockId })
      .from(routineChallengeBlocks)
      .where(eq(routineChallengeBlocks.challengeId, id))
      .orderBy(asc(routineChallengeBlocks.blockId));
    return { ...row, blockIds: links.map((l) => l.blockId) };
  }

  async remove(ownerId: string, id: string) {
    const [row] = await db
      .delete(routineChallenges)
      .where(
        and(
          eq(routineChallenges.id, id),
          eq(routineChallenges.ownerId, ownerId),
        ),
      )
      .returning({ id: routineChallenges.id });
    if (!row) {
      throw new NotFoundException(`Challenge ${id} not found`);
    }
    return { id: row.id };
  }
}

function isoToday(): string {
  // Seoul 기준 오늘. 서버가 UTC여도 KST 날짜로.
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
