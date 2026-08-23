import { Injectable } from '@nestjs/common';
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
  async dumpAll() {
    const [
      companiesRows,
      timeBlocksRows,
      routineChecksRows,
      dayNotesRows,
      exercisesRows,
      workoutSessionsRows,
      workoutSetsRows,
    ] = await Promise.all([
      db.select().from(companies),
      db.select().from(timeBlocks),
      db.select().from(routineChecks),
      db.select().from(dayNotes),
      db.select().from(exercises),
      db.select().from(workoutSessions),
      db.select().from(workoutSets),
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
