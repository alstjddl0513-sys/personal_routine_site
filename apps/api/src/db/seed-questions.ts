import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';
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
      .select({
        id: questions.id,
        content: questions.content,
        answer: questions.answer,
        tip: questions.tip,
      })
      .from(questions)
      .where(eq(questions.ownerId, ownerId));
    const existingByContent = new Map(existing.map((r) => [r.content, r]));

    // Insert missing rows first.
    const missing = SEED.filter((q) => !existingByContent.has(q.content));
    if (missing.length > 0) {
      const rows = missing.map((q) => ({ ...q, ownerId }));
      await db.insert(questions).values(rows);
      console.log(`Inserted ${rows.length} new questions:`);
      for (const r of rows) console.log(`  + ${r.content}`);
    }

    // Then sync answer/tip on already-present rows if they drift from the
    // curated defaults. Content is the join key so wording changes create a
    // new row (see above) rather than mutating in place.
    let updatedCount = 0;
    for (const q of SEED) {
      const row = existingByContent.get(q.content);
      if (!row) continue;
      const nextTip = q.tip ?? null;
      if (row.answer === q.answer && row.tip === nextTip) continue;
      await db
        .update(questions)
        .set({ answer: q.answer, tip: nextTip, updatedAt: new Date() })
        .where(and(eq(questions.id, row.id), eq(questions.ownerId, ownerId)));
      updatedCount += 1;
    }
    if (updatedCount > 0) {
      console.log(`Updated ${updatedCount} existing questions (answer/tip sync).`);
    } else if (missing.length === 0) {
      console.log(
        `All ${SEED.length} seed questions already up to date. Nothing to do.`,
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
