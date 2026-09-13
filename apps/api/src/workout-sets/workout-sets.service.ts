import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, between, desc, eq, isNotNull, lt, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { exercises, workoutSessions, workoutSets } from '../db/schema';
import type { BatchWorkoutSetsDto } from './dto/batch-workout-sets.dto';
import type { QueryHeatmapDto } from './dto/query-heatmap.dto';
import type { QueryWeeklyVolumeDto } from './dto/query-weekly-volume.dto';
import type { QueryWorkoutSetsDto } from './dto/query-workout-sets.dto';
import type { QueryPreviousDto } from './dto/query-previous.dto';
import type { QueryExerciseStatsDto } from './dto/query-exercise-stats.dto';

@Injectable()
export class WorkoutSetsService {
  async findAll(ownerId: string, query: QueryWorkoutSetsDto) {
    if (!query.sessionId) {
      throw new BadRequestException('sessionId is required');
    }
    return db
      .select()
      .from(workoutSets)
      .where(
        and(
          eq(workoutSets.ownerId, ownerId),
          eq(workoutSets.sessionId, query.sessionId),
        ),
      )
      .orderBy(asc(workoutSets.exerciseId), asc(workoutSets.setNumber));
  }

  // Replace all sets for (sessionId, exerciseId) atomically.
  async batchReplace(ownerId: string, dto: BatchWorkoutSetsDto) {
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
      // Verify both parents belong to this user before touching sets. Prevents
      // a caller from stamping their owner_id onto a stranger's session.
      const [session] = await tx
        .select({ id: workoutSessions.id })
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.id, dto.sessionId),
            eq(workoutSessions.ownerId, ownerId),
          ),
        )
        .limit(1);
      if (!session) {
        throw new NotFoundException(`WorkoutSession ${dto.sessionId} not found`);
      }
      const [exercise] = await tx
        .select({ id: exercises.id })
        .from(exercises)
        .where(
          and(eq(exercises.id, dto.exerciseId), eq(exercises.ownerId, ownerId)),
        )
        .limit(1);
      if (!exercise) {
        throw new NotFoundException(`Exercise ${dto.exerciseId} not found`);
      }

      await tx
        .delete(workoutSets)
        .where(
          and(
            eq(workoutSets.ownerId, ownerId),
            eq(workoutSets.sessionId, dto.sessionId),
            eq(workoutSets.exerciseId, dto.exerciseId),
          ),
        );
      const inserted =
        dto.sets.length === 0
          ? []
          : await tx
              .insert(workoutSets)
              .values(
                dto.sets.map((s) => ({
                  ownerId,
                  sessionId: dto.sessionId,
                  exerciseId: dto.exerciseId,
                  setNumber: s.setNumber,
                  // drizzle-orm's numeric column takes string; coerce here so callers
                  // can pass a plain number.
                  weightKg:
                    s.weightKg === null || s.weightKg === undefined
                      ? null
                      : String(s.weightKg),
                  reps: s.reps ?? null,
                  rir: s.rir ?? null,
                })),
              )
              .returning();

      // If the session ended up empty (no sets, no note), delete it so the
      // heatmap doesn't keep lighting up for a day the user cleared out.
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(workoutSets)
        .where(
          and(
            eq(workoutSets.ownerId, ownerId),
            eq(workoutSets.sessionId, dto.sessionId),
          ),
        );
      if (count === 0) {
        const [row] = await tx
          .select({ note: workoutSessions.note })
          .from(workoutSessions)
          .where(
            and(
              eq(workoutSessions.id, dto.sessionId),
              eq(workoutSessions.ownerId, ownerId),
            ),
          );
        if (row && (row.note === null || row.note.trim() === '')) {
          await tx
            .delete(workoutSessions)
            .where(
              and(
                eq(workoutSessions.id, dto.sessionId),
                eq(workoutSessions.ownerId, ownerId),
              ),
            );
        }
      }

      return inserted;
    });
  }

  // Heatmap counts: per date, how many distinct exercises had at least one
  // "complete" set (weight AND reps both recorded). Rows for empty days are
  // omitted; the caller fills them in as zero.
  async findHeatmap(ownerId: string, query: QueryHeatmapDto) {
    return db
      .select({
        date: workoutSessions.date,
        completedExerciseCount: sql<number>`count(distinct ${workoutSets.exerciseId})::int`,
      })
      .from(workoutSessions)
      .innerJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.ownerId, ownerId),
          between(workoutSessions.date, query.from, query.to),
          isNotNull(workoutSets.weightKg),
          isNotNull(workoutSets.reps),
        ),
      )
      .groupBy(workoutSessions.date);
  }

  // Weekly volume for the sparkline on /workouts/statistics. Volume = sum of
  // (weight_kg × reps) across all "complete" sets (both weight and reps
  // recorded). Grouped by ISO week (Monday-start via date_trunc('week')).
  // Empty weeks omitted; client fills the missing weeks with 0.
  async findWeeklyVolume(ownerId: string, query: QueryWeeklyVolumeDto) {
    return db
      .select({
        weekStart: sql<string>`(date_trunc('week', ${workoutSessions.date}::timestamp)::date)::text`,
        volumeKg: sql<number>`sum(${workoutSets.weightKg}::numeric * ${workoutSets.reps})::float`,
      })
      .from(workoutSessions)
      .innerJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.ownerId, ownerId),
          between(workoutSessions.date, query.from, query.to),
          isNotNull(workoutSets.weightKg),
          isNotNull(workoutSets.reps),
        ),
      )
      .groupBy(sql`date_trunc('week', ${workoutSessions.date}::timestamp)`)
      .orderBy(sql`date_trunc('week', ${workoutSessions.date}::timestamp)`);
  }

  // Sets from the most recent session (before `beforeDate`) that used this exercise.
  // Returns { date, sets } or null.
  async findPrevious(ownerId: string, query: QueryPreviousDto) {
    const [prevSession] = await db
      .select({ id: workoutSessions.id, date: workoutSessions.date })
      .from(workoutSessions)
      .innerJoin(workoutSets, eq(workoutSets.sessionId, workoutSessions.id))
      .where(
        and(
          eq(workoutSessions.ownerId, ownerId),
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
          eq(workoutSets.ownerId, ownerId),
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
  async findExerciseStats(ownerId: string, query: QueryExerciseStatsDto) {
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
          eq(workoutSets.ownerId, ownerId),
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
          eq(workoutSets.ownerId, ownerId),
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
