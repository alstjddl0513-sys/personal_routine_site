import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, lt, max } from 'drizzle-orm';
import {
  planSplitTemplate,
  type WorkoutSplit,
  type WorkoutSplitTemplate,
  type WorkoutSplitsResponse,
} from '@repo/shared';
import { db } from '../db/client';
import {
  exercises,
  workoutSessions,
  workoutSplitExercises,
  workoutSplits,
} from '../db/schema';
import type { CreateWorkoutSplitDto } from './dto/create-workout-split.dto';
import type { UpdateWorkoutSplitDto } from './dto/update-workout-split.dto';
import type { QueryWorkoutSplitsDto } from './dto/query-workout-splits.dto';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// 분할 = 이름 + 종목 목록 + 순서. 요일이 아니라 sortOrder 순서대로 돌아가며 함 —
// 다음 차례 = 마지막으로 한 분할의 그다음(끝이면 처음).
@Injectable()
export class WorkoutSplitsService {
  async findAll(
    ownerId: string,
    query: QueryWorkoutSplitsDto,
  ): Promise<WorkoutSplitsResponse> {
    const splits = await this.list(ownerId);
    if (splits.length === 0) {
      return { splits, lastSplitId: null, nextSplitId: null };
    }

    // before 이전에 분할을 기록한 가장 최근 세션 (지운 분할은 SET NULL이라 자연히 빠짐).
    const before = query.before ?? isoDateInSeoul(new Date());
    const [last] = await db
      .select({ splitId: workoutSessions.splitId })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.ownerId, ownerId),
          isNotNull(workoutSessions.splitId),
          lt(workoutSessions.date, before),
        ),
      )
      .orderBy(desc(workoutSessions.date), desc(workoutSessions.createdAt))
      .limit(1);

    const lastSplitId = last?.splitId ?? null;
    const lastIdx = splits.findIndex((s) => s.id === lastSplitId);
    const next =
      lastIdx === -1 ? splits[0] : splits[(lastIdx + 1) % splits.length];
    return { splits, lastSplitId, nextSplitId: next.id };
  }

  async create(
    ownerId: string,
    dto: CreateWorkoutSplitDto,
  ): Promise<WorkoutSplit> {
    return db.transaction(async (tx) => {
      await this.assertOwnedExercises(tx, ownerId, dto.exerciseIds);
      const sortOrder = await this.nextSortOrder(tx, ownerId);
      const [row] = await tx
        .insert(workoutSplits)
        .values({ ownerId, name: dto.name.trim(), sortOrder })
        .returning();
      await this.replaceExercises(tx, row.id, dto.exerciseIds);
      return toSplit(row, unique(dto.exerciseIds));
    });
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateWorkoutSplitDto,
  ): Promise<WorkoutSplit> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(workoutSplits)
        .set({
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(eq(workoutSplits.id, id), eq(workoutSplits.ownerId, ownerId)),
        )
        .returning();
      if (!row) throw new NotFoundException(`WorkoutSplit ${id} not found`);

      if (dto.exerciseIds !== undefined) {
        await this.assertOwnedExercises(tx, ownerId, dto.exerciseIds);
        await this.replaceExercises(tx, id, dto.exerciseIds);
      }
      const links = await tx
        .select({ exerciseId: workoutSplitExercises.exerciseId })
        .from(workoutSplitExercises)
        .where(eq(workoutSplitExercises.splitId, id));
      return toSplit(
        row,
        links.map((l) => l.exerciseId),
      );
    });
  }

  // 분할을 지워도 운동 기록은 남음(workout_sessions.split_id SET NULL).
  async remove(ownerId: string, id: string) {
    const [row] = await db
      .delete(workoutSplits)
      .where(and(eq(workoutSplits.id, id), eq(workoutSplits.ownerId, ownerId)))
      .returning({ id: workoutSplits.id });
    if (!row) throw new NotFoundException(`WorkoutSplit ${id} not found`);
    return { id: row.id };
  }

  // 처음부터 다시 짜기 — 내 분할 전부. 하나씩 지우다 중간에 실패하지 않게 한 번에.
  // 기록의 split_id는 FK SET NULL로 비워지고 운동 기록은 남음.
  async removeAll(ownerId: string) {
    const rows = await db
      .delete(workoutSplits)
      .where(eq(workoutSplits.ownerId, ownerId))
      .returning({ id: workoutSplits.id });
    return { deleted: rows.length };
  }

  // ids = 내 분할 전부를 새 순서대로. 하나라도 빠지거나 남의 것이면 거절.
  async reorder(ownerId: string, ids: string[]): Promise<WorkoutSplit[]> {
    await db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: workoutSplits.id })
        .from(workoutSplits)
        .where(eq(workoutSplits.ownerId, ownerId));
      const ownedIds = new Set(owned.map((o) => o.id));
      if (
        ids.length !== ownedIds.size ||
        new Set(ids).size !== ids.length ||
        ids.some((id) => !ownedIds.has(id))
      ) {
        throw new BadRequestException('분할 목록이 맞지 않아요.');
      }
      for (const [i, id] of ids.entries()) {
        await tx
          .update(workoutSplits)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(
            and(eq(workoutSplits.id, id), eq(workoutSplits.ownerId, ownerId)),
          );
      }
    });
    return this.list(ownerId);
  }

  // 예시로 한 번에 만들기 — 기존 분할 뒤에 이어 붙임. 배정 규칙은 @repo/shared
  // planSplitTemplate 하나(화면 미리보기와 같은 결과).
  async createFromTemplate(
    ownerId: string,
    kind: WorkoutSplitTemplate,
  ): Promise<WorkoutSplit[]> {
    const active = await db
      .select({ id: exercises.id, targetMuscle: exercises.targetMuscle })
      .from(exercises)
      .where(
        and(eq(exercises.ownerId, ownerId), eq(exercises.isArchived, false)),
      )
      .orderBy(asc(exercises.sortOrder));
    const plan = planSplitTemplate(kind, active).splits;

    await db.transaction(async (tx) => {
      let sortOrder = await this.nextSortOrder(tx, ownerId);
      for (const p of plan) {
        const [row] = await tx
          .insert(workoutSplits)
          .values({ ownerId, name: p.name, sortOrder: sortOrder++ })
          .returning();
        await this.replaceExercises(tx, row.id, p.exerciseIds);
      }
    });
    return this.list(ownerId);
  }

  // ---- 내부 ----

  private async list(ownerId: string): Promise<WorkoutSplit[]> {
    const rows = await db
      .select()
      .from(workoutSplits)
      .where(eq(workoutSplits.ownerId, ownerId))
      .orderBy(asc(workoutSplits.sortOrder), asc(workoutSplits.createdAt));
    if (rows.length === 0) return [];
    const links = await db
      .select({
        splitId: workoutSplitExercises.splitId,
        exerciseId: workoutSplitExercises.exerciseId,
      })
      .from(workoutSplitExercises)
      .where(
        inArray(
          workoutSplitExercises.splitId,
          rows.map((r) => r.id),
        ),
      );
    const bySplit = new Map<string, string[]>();
    for (const l of links) {
      const arr = bySplit.get(l.splitId);
      if (arr) arr.push(l.exerciseId);
      else bySplit.set(l.splitId, [l.exerciseId]);
    }
    return rows.map((r) => toSplit(r, bySplit.get(r.id) ?? []));
  }

  private async nextSortOrder(tx: Tx, ownerId: string): Promise<number> {
    const [{ m }] = await tx
      .select({ m: max(workoutSplits.sortOrder) })
      .from(workoutSplits)
      .where(eq(workoutSplits.ownerId, ownerId));
    return (m ?? -1) + 1;
  }

  // 남의 종목 id면 거절 (챌린지 블록 소유권 검증과 같은 방식).
  private async assertOwnedExercises(tx: Tx, ownerId: string, ids: string[]) {
    const wanted = unique(ids);
    if (wanted.length === 0) return;
    const owned = await tx
      .select({ id: exercises.id })
      .from(exercises)
      .where(
        and(eq(exercises.ownerId, ownerId), inArray(exercises.id, wanted)),
      );
    if (owned.length !== wanted.length) {
      throw new BadRequestException('일부 종목이 없거나 내 종목이 아니에요.');
    }
  }

  private async replaceExercises(tx: Tx, splitId: string, ids: string[]) {
    await tx
      .delete(workoutSplitExercises)
      .where(eq(workoutSplitExercises.splitId, splitId));
    const wanted = unique(ids);
    if (wanted.length === 0) return;
    await tx
      .insert(workoutSplitExercises)
      .values(wanted.map((exerciseId) => ({ splitId, exerciseId })));
  }
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

function toSplit(
  row: typeof workoutSplits.$inferSelect,
  exerciseIds: string[],
): WorkoutSplit {
  return { id: row.id, name: row.name, sortOrder: row.sortOrder, exerciseIds };
}

// Seoul 기준 날짜(YYYY-MM-DD). 서버가 UTC여도 KST 날짜로.
function isoDateInSeoul(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
