import { BadRequestException, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { muscleGoals } from '../db/schema';
import type { UpsertMuscleGoalDto } from './dto/upsert-muscle-goal.dto';

@Injectable()
export class MuscleGoalsService {
  async findAll(ownerId: string) {
    return db
      .select()
      .from(muscleGoals)
      .where(eq(muscleGoals.ownerId, ownerId))
      .orderBy(asc(muscleGoals.createdAt));
  }

  // Upsert by (owner_id, muscle_key). muscleKey는 URL param으로 오는
  // 사용자 표기(등/가슴/…의 key: 'back'/'chest'/…). exercises.target_muscle과
  // 마찬가지로 자유 text — 여기선 존재 검증 없이 그대로 저장.
  async upsert(ownerId: string, muscleKey: string, dto: UpsertMuscleGoalDto) {
    const key = muscleKey.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(key)) {
      throw new BadRequestException(
        'muscleKey는 소문자/숫자/언더스코어만 허용',
      );
    }

    const [row] = await db
      .insert(muscleGoals)
      .values({
        ownerId,
        muscleKey: key,
        weeklySetTarget: dto.weeklySetTarget,
      })
      .onConflictDoUpdate({
        target: [muscleGoals.ownerId, muscleGoals.muscleKey],
        set: {
          weeklySetTarget: dto.weeklySetTarget,
          updatedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async remove(ownerId: string, muscleKey: string) {
    const key = muscleKey.trim().toLowerCase();
    const [row] = await db
      .delete(muscleGoals)
      .where(
        and(
          eq(muscleGoals.ownerId, ownerId),
          eq(muscleGoals.muscleKey, key),
        ),
      )
      .returning({ id: muscleGoals.id });
    return row ? { id: row.id } : null;
  }
}
