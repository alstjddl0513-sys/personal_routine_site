import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { questions } from './schema';
import { DEFAULT_QUESTIONS } from './defaults';

config({ path: resolve(__dirname, '../../../../.env') });

const SEED = DEFAULT_QUESTIONS;

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
    // Dedupe by question content — no natural key column, so text match
    // stands in. If a seed question's wording ever changes it'll insert a new
    // row alongside the old one; that's the trade-off for content-based dedupe.
    const existing = await db
      .select({ content: questions.content })
      .from(questions)
      .where(eq(questions.ownerId, ownerId));
    const existingContent = new Set(existing.map((r) => r.content));

    const missing = SEED.filter((q) => !existingContent.has(q.content));
    if (missing.length === 0) {
      console.log(
        `All ${SEED.length} seed questions already present. Nothing to do.`,
      );
      return;
    }

    const rows = missing.map((q) => ({ ...q, ownerId }));
    await db.insert(questions).values(rows);
    console.log(`Inserted ${rows.length} new questions:`);
    for (const r of rows) console.log(`  + ${r.content}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
