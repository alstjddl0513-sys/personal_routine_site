import { BadRequestException, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, isNotNull, lt } from 'drizzle-orm';
import { db } from '../db/client';
import { workoutSessions, workoutSets } from '../db/schema';
import type { BatchWorkoutSetsDto } from './dto/batch-workout-sets.dto';
import type { QueryWorkoutSetsDto } from './dto/query-workout-sets.dto';
import type { QueryPreviousDto } from './dto/query-previous.dto';
import type { QueryExerciseStatsDto } from './dto/query-exercise-stats.dto';

@Injectable()
export class WorkoutSetsService {
  async findAll(query: QueryWorkoutSetsDto) {
    if (!query.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    return db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, query.sessionId))
      .orderBy(asc(workoutSets.exerciseId), asc(workoutSets.setNumber));
  }

  // Replace all sets for (sessionId, exerciseId) atomically.
  async batchReplace(dto: BatchWorkoutSetsDto) {
    // Validate setNumber uniqueness inside the batch (DB will also reject via UNIQUE,
    // but a friendly 400 beats a 500).
    const nums = new Set<number>();
    for (const s of dto.sets) {
      if (nums.has(s.setNumber)) {
        throw new BadRequestException(`duplicate setNumber ${s.setNumber} in batch`);
      }
      nums.add(s.setNumber);
    }

    return db.transaction(async (tx) => {
      await tx
        .delete(workoutSets)
        .where(
          and(
            eq(workoutSets.sessionId, dto.sessionId),
            eq(workoutSets.exerciseId, dto.exerciseId),
          ),
        );
      if (dto.sets.length === 0) return [];
      const inserted = await tx
        .insert(workoutSets)
        .values(
          dto.sets.map((s) => ({
            sessionId: dto.sessionId,
            exerciseId: dto.exerciseId,
            setNumber: s.setNumber,
            // drizzle-orm's numeric column takes string; coerce here so callers
            // can pass a plain number.
            weightKg: s.weightKg === null || s.weightKg === undefined ? null : String(s.weightKg),
            reps: s.reps ?? null,
            rir: s.rir ?? null,
          })),
        )
        .returning();
      return inserted;
    });
  }

  // Sets from the most recent session (before `beforeDate`) that used this exercise.
  // Returns { date, sets } or null.
  async findPrevious(query: QueryPreviousDto) {
    const [prevSession] = await db
      .select({ id: workoutSessions.id, date: workoutSessions.date })
      .from(workoutSessions)
      .innerJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSets.exerciseId, query.exerciseId),
          lt(workoutSessions.date, query.beforeDate),
        ),
      )
      .orderBy(desc(workoutSessions.date))
      .limit(1);

    if (!prevSession) return null;

    const sets = await db
      .select({
        setNumber: workoutSets.setNumber,
        weightKg: workoutSets.weightKg,
        reps: workoutSets.reps,
        rir: workoutSets.rir,
      })
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.sessionId, prevSession.id),
          eq(workoutSets.exerciseId, query.exerciseId),
        ),
      )
      .orderBy(asc(workoutSets.setNumber));

    return { date: prevSession.date, sets };
  }

  // Stats for a single exercise:
  //   - history: top set per session (max weight, tie-break max reps),
  //     most recent `limit` sessions with weight recorded
  //   - pr: all-time top set (max weight, tie-break max reps, then latest date)
  // Both require weight_kg IS NOT NULL — a reps-only row can't sit on a
  // progression chart.
  async findExerciseStats(query: QueryExerciseStatsDto) {
    const limit = query.limit ?? 12;

    // Fetch (recent first) all weighted sets for this exercise, DB sorts
    // so first row per session is the top. Dedup by session in JS.
    const rows = await db
      .select({
        sessionId: workoutSets.sessionId,
        sessionDate: workoutSessions.date,
        weightKg: workoutSets.weightKg,
        reps: workoutSets.reps,
      })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSets.sessionId))
      .where(
        and(
          eq(workoutSets.exerciseId, query.exerciseId),
          isNotNull(workoutSets.weightKg),
        ),
      )
      .orderBy(
        desc(workoutSessions.date),
        desc(workoutSets.weightKg),
        desc(workoutSets.reps),
      );

    const seen = new Set<string>();
    const history: {
      sessionDate: string;
      topWeightKg: string;
      topReps: number | null;
    }[] = [];
    for (const r of rows) {
      if (seen.has(r.sessionId)) continue;
      seen.add(r.sessionId);
      history.push({
        sessionDate: r.sessionDate,
        topWeightKg: r.weightKg as string,
        topReps: r.reps,
      });
      if (history.length >= limit) break;
    }

    const [prRow] = await db
      .select({
        weightKg: workoutSets.weightKg,
        reps: workoutSets.reps,
        sessionDate: workoutSessions.date,
      })
      .from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSessions.id, workoutSets.sessionId))
      .where(
        and(
          eq(workoutSets.exerciseId, query.exerciseId),
          isNotNull(workoutSets.weightKg),
        ),
      )
      .orderBy(
        desc(workoutSets.weightKg),
        desc(workoutSets.reps),
        desc(workoutSessions.date),
      )
      .limit(1);

    return {
      history,
      pr: prRow
        ? {
            weightKg: prRow.weightKg as string,
            reps: prRow.reps,
            sessionDate: prRow.sessionDate,
          }
        : null,
    };
  }
}
