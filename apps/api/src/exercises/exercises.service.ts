import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, eq, max } from 'drizzle-orm';
import { db } from '../db/client';
import { exercises } from '../db/schema';
import type { CreateExerciseDto } from './dto/create-exercise.dto';
import type { UpdateExerciseDto } from './dto/update-exercise.dto';
import type { QueryExercisesDto } from './dto/query-exercises.dto';

@Injectable()
export class ExercisesService {
  async findAll(query: QueryExercisesDto) {
    const q = db.select().from(exercises).orderBy(asc(exercises.sortOrder));
    if (query.includeArchived) return q;
    return q.where(eq(exercises.isArchived, false));
  }

  async findOne(id: string) {
    const [row] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
    if (!row) throw new NotFoundException(`Exercise ${id} not found`);
    return row;
  }

  async create(dto: CreateExerciseDto) {
    if (dto.repMin > dto.repMax) {
      throw new BadRequestException('repMin must be <= repMax');
    }
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const [{ maxOrder }] = await db
        .select({ maxOrder: max(exercises.sortOrder) })
        .from(exercises);
      sortOrder = (maxOrder ?? -1) + 1;
    }
    const [row] = await db
      .insert(exercises)
      .values({
        name: dto.name,
        targetMuscle: dto.targetMuscle,
        defaultSets: dto.defaultSets ?? 3,
        repMin: dto.repMin,
        repMax: dto.repMax,
        sortOrder,
      })
      .returning();
    return row;
  }

  async update(id: string, dto: UpdateExerciseDto) {
    if (dto.repMin !== undefined && dto.repMax !== undefined && dto.repMin > dto.repMax) {
      throw new BadRequestException('repMin must be <= repMax');
    }
    const [row] = await db
      .update(exercises)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(exercises.id, id))
      .returning();
    if (!row) throw new NotFoundException(`Exercise ${id} not found`);
    return row;
  }

  async remove(id: string) {
    // FK from workout_sets is ON DELETE RESTRICT — fails (23503) if sets exist.
    // Translate to 409 so the client can suggest archiving instead.
    try {
      const [row] = await db
        .delete(exercises)
        .where(eq(exercises.id, id))
        .returning({ id: exercises.id });
      if (!row) throw new NotFoundException(`Exercise ${id} not found`);
      return { id: row.id };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (pgCode(err) === '23503') {
        throw new ConflictException(
          'Exercise has recorded sets — archive it instead of deleting.',
        );
      }
      throw err;
    }
  }
}

// postgres.js는 대개 err.code에 SQLSTATE를 직접 담지만, Drizzle이 wrap하는
// 경로에서는 err.cause.code에 들어오는 케이스가 있어 양쪽 다 훑는다.
function pgCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return;
  const e = err as { code?: unknown; cause?: unknown };
  if (typeof e.code === 'string') return e.code;
  if (e.cause && typeof e.cause === 'object') {
    const c = (e.cause as { code?: unknown }).code;
    if (typeof c === 'string') return c;
  }
  return;
}
