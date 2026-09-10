import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, between, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { workoutSessions } from '../db/schema';
import type { QueryWorkoutSessionsDto } from './dto/query-workout-sessions.dto';
import type { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import type { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';

@Injectable()
export class WorkoutSessionsService {
  async findAll(ownerId: string, query: QueryWorkoutSessionsDto) {
    if (query.date) {
      return db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.ownerId, ownerId),
            eq(workoutSessions.date, query.date),
          ),
        )
        .orderBy(asc(workoutSessions.createdAt));
    }
    if (query.from && query.to) {
      return db
        .select()
        .from(workoutSessions)
        .where(
          and(
            eq(workoutSessions.ownerId, ownerId),
            between(workoutSessions.date, query.from, query.to),
          ),
        )
        .orderBy(asc(workoutSessions.date), asc(workoutSessions.createdAt));
    }
    return [];
  }

  async findOne(ownerId: string, id: string) {
    const [row] = await db
      .select()
      .from(workoutSessions)
      .where(
        and(eq(workoutSessions.id, id), eq(workoutSessions.ownerId, ownerId)),
      )
      .limit(1);
    if (!row) throw new NotFoundException(`WorkoutSession ${id} not found`);
    return row;
  }

  async create(ownerId: string, dto: CreateWorkoutSessionDto) {
    const [row] = await db
      .insert(workoutSessions)
      .values({ ...dto, ownerId })
      .returning();
    return row;
  }

  async update(ownerId: string, id: string, dto: UpdateWorkoutSessionDto) {
    const [row] = await db
      .update(workoutSessions)
      .set({ ...dto, updatedAt: new Date() })
      .where(
        and(eq(workoutSessions.id, id), eq(workoutSessions.ownerId, ownerId)),
      )
      .returning();
    if (!row) throw new NotFoundException(`WorkoutSession ${id} not found`);
    return row;
  }

  async remove(ownerId: string, id: string) {
    const [row] = await db
      .delete(workoutSessions)
      .where(
        and(eq(workoutSessions.id, id), eq(workoutSessions.ownerId, ownerId)),
      )
      .returning({ id: workoutSessions.id });
    if (!row) throw new NotFoundException(`WorkoutSession ${id} not found`);
    return { id: row.id };
  }
}
