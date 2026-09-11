import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { exercises } from './schema';
import { DEFAULT_EXERCISES } from './defaults';

config({ path: resolve(__dirname, '../../../../.env') });

const EXERCISE_SEED = DEFAULT_EXERCISES;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Check the root .env file.');
  }
  const ownerId = process.env.SEED_OWNER_ID;
  if (!ownerId) {
    throw new Error('SEED_OWNER_ID is not set (Phase 12.4: owner_id NOT NULL).');
  }

  const client = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  const db = drizzle(client);

  try {
    const existing = await db
      .select({ name: exercises.name, sortOrder: exercises.sortOrder })
      .from(exercises)
      .where(eq(exercises.ownerId, ownerId));
    const existingNames = new Set(existing.map((r) => r.name));
    const maxSortOrder = existing.reduce(
      (max, r) => (r.sortOrder > max ? r.sortOrder : max),
      -1,
    );

    const missing = EXERCISE_SEED.filter((r) => !existingNames.has(r.name));

    if (missing.length === 0) {
      console.log(`All ${EXERCISE_SEED.length} seed exercises already present. Nothing to do.`);
      return;
    }

    const rows = missing.map((r, i) => ({
      ...r,
      ownerId,
      sortOrder: maxSortOrder + 1 + i,
    }));
    await db.insert(exercises).values(rows);
    console.log(
      `Inserted ${rows.length} new exercises (sort_order ${maxSortOrder + 1}~${maxSortOrder + rows.length}):`,
    );
    for (const r of rows) console.log(`  + ${r.name} (${r.targetMuscle})`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
