import { Injectable, NotFoundException } from '@nestjs/common';
import { asc, between, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { workoutSessions } from '../db/schema';
import type { QueryWorkoutSessionsDto } from './dto/query-workout-sessions.dto';
import type { CreateWorkoutSessionDto } from './dto/create-workout-session.dto';
import type { UpdateWorkoutSessionDto } from './dto/update-workout-session.dto';

@Injectable()
export class WorkoutSessionsService {
  async findAll(query: QueryWorkoutSessionsDto) {
    if (query.date) {
      return db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.date, query.date))
        .orderBy(asc(workoutSessions.createdAt));
    }
    if (query.from && query.to) {
      return db
        .select()
        .from(workoutSessions)
        .where(between(workoutSessions.date, query.from, query.to))
        .orderBy(asc(workoutSessions.date), asc(workoutSessions.createdAt));
    }
    return [];
  }

  async findOne(id: string) {
    const [row] = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.id, id))
      .limit(1);
    if (!row) throw new NotFoundException(`WorkoutSession ${id} not found`);
    return row;
  }

  async create(dto: CreateWorkoutSessionDto) {
    const [row] = await db.insert(workoutSessions).values(dto).returning();
    return row;
  }

  async update(id: string, dto: UpdateWorkoutSessionDto) {
    const [row] = await db
      .update(workoutSessions)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(workoutSessions.id, id))
      .returning();
    if (!row) throw new NotFoundException(`WorkoutSession ${id} not found`);
    return row;
  }

  async remove(id: string) {
    const [row] = await db
      .delete(workoutSessions)
      .where(eq(workoutSessions.id, id))
      .returning({ id: workoutSessions.id });
    if (!row) throw new NotFoundException(`WorkoutSession ${id} not found`);
    return { id: row.id };
  }
}
