import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { isNull, sql } from 'drizzle-orm';
import postgres from 'postgres';
import {
  blogPosts,
  blogSources,
  companies,
  companyTypes,
  dayNotes,
  exercises,
  routineChecks,
  timeBlocks,
  workoutSessions,
  workoutSets,
} from './schema';

config({ path: resolve(__dirname, '../../../../.env') });

// Phase 12.4 backfill. Stamps every pre-auth row across the 10 domain
// tables with the operator's own Supabase user id, so the follow-up
// NOT NULL migration doesn't reject them.
//
// Idempotent: only rows where owner_id IS NULL are touched.
// Run once locally, then once against prod with the prod user's UUID.
//
// Usage:
//   $env:SEED_OWNER_ID = "<uuid>"   # PowerShell
//   pnpm --filter api db:seed:owner

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Check the root .env file.');
  }

  const ownerId = process.env.SEED_OWNER_ID;
  if (!ownerId) {
    throw new Error(
      'SEED_OWNER_ID is not set. Grab your Supabase auth.users.id and set it in the shell.',
    );
  }
  if (!/^[0-9a-fA-F-]{36}$/.test(ownerId)) {
    throw new Error(`SEED_OWNER_ID is not a UUID: ${ownerId}`);
  }

  console.log(`Backfilling owner_id = ${ownerId} where NULL...`);

  const client = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  const db = drizzle(client);

  // Parent-first order. Not strictly required since we're not touching FKs,
  // but keeps the log readable when tailing.
  const targets = [
    { name: 'companies', table: companies, col: companies.ownerId },
    { name: 'company_types', table: companyTypes, col: companyTypes.ownerId },
    { name: 'time_blocks', table: timeBlocks, col: timeBlocks.ownerId },
    { name: 'day_notes', table: dayNotes, col: dayNotes.ownerId },
    { name: 'exercises', table: exercises, col: exercises.ownerId },
    { name: 'workout_sessions', table: workoutSessions, col: workoutSessions.ownerId },
    { name: 'blog_sources', table: blogSources, col: blogSources.ownerId },
    { name: 'routine_checks', table: routineChecks, col: routineChecks.ownerId },
    { name: 'workout_sets', table: workoutSets, col: workoutSets.ownerId },
    { name: 'blog_posts', table: blogPosts, col: blogPosts.ownerId },
  ] as const;

  try {
    for (const t of targets) {
      const result = await db
        .update(t.table)
        .set({ ownerId })
        .where(isNull(t.col));
      // postgres.js returns `count` on the result object; Drizzle passes it through.
      const count = (result as unknown as { count?: number }).count ?? 0;
      console.log(`  ${t.name.padEnd(18)} → ${count} rows updated`);
    }

    // Sanity check — verify no NULLs remain.
    const nullChecks: Array<[string, number]> = [];
    for (const t of targets) {
      const [row] = await db.execute<{ n: number }>(
        sql`select count(*)::int as n from ${t.table} where ${t.col} is null`,
      );
      nullChecks.push([t.name, row.n]);
    }
    console.log('Remaining NULLs:');
    for (const [name, n] of nullChecks) {
      console.log(`  ${name.padEnd(18)} = ${n}`);
    }
    const totalNulls = nullChecks.reduce((sum, [, n]) => sum + n, 0);
    if (totalNulls > 0) {
      throw new Error(
        `Backfill left ${totalNulls} NULL owner_id rows — do NOT proceed to NOT NULL migration.`,
      );
    }
    console.log('Backfill complete.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
