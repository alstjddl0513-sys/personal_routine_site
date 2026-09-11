import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import {
  companies,
  dayNotes,
  exercises,
  routineChecks,
  timeBlocks,
  workoutSessions,
  workoutSets,
} from '../db/schema';

// Whole-DB dump for local backup. Small enough (a few thousand rows total)
// that pagination/streaming isn't worth the code. Increment schemaVersion
// only if the shape changes in a way a restore script would care about.
@Injectable()
export class ExportService {
  async dumpAll(ownerId: string) {
    const [
      companiesRows,
      timeBlocksRows,
      routineChecksRows,
      dayNotesRows,
      exercisesRows,
      workoutSessionsRows,
      workoutSetsRows,
    ] = await Promise.all([
      db.select().from(companies).where(eq(companies.ownerId, ownerId)),
      db.select().from(timeBlocks).where(eq(timeBlocks.ownerId, ownerId)),
      db.select().from(routineChecks).where(eq(routineChecks.ownerId, ownerId)),
      db.select().from(dayNotes).where(eq(dayNotes.ownerId, ownerId)),
      db.select().from(exercises).where(eq(exercises.ownerId, ownerId)),
      db.select().from(workoutSessions).where(eq(workoutSessions.ownerId, ownerId)),
      db.select().from(workoutSets).where(eq(workoutSets.ownerId, ownerId)),
    ]);

    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        companies: companiesRows,
        timeBlocks: timeBlocksRows,
        routineChecks: routineChecksRows,
        dayNotes: dayNotesRows,
        exercises: exercisesRows,
        workoutSessions: workoutSessionsRows,
        workoutSets: workoutSetsRows,
      },
    };
  }
}
