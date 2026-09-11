import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { blogSources } from './schema';
import { DEFAULT_BLOG_SOURCES } from './defaults';

config({ path: resolve(__dirname, '../../../../.env') });

const SEED = DEFAULT_BLOG_SOURCES;

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
      .select({ rssUrl: blogSources.rssUrl, sortOrder: blogSources.sortOrder })
      .from(blogSources)
      .where(eq(blogSources.ownerId, ownerId));
    const existingUrls = new Set(existing.map((r) => r.rssUrl));
    const maxSortOrder = existing.reduce(
      (max, r) => (r.sortOrder > max ? r.sortOrder : max),
      -1,
    );

    const missing = SEED.filter((s) => !existingUrls.has(s.rssUrl));
    if (missing.length === 0) {
      console.log(`All ${SEED.length} seed sources already present. Nothing to do.`);
      return;
    }

    const rows = missing.map((s, i) => ({
      ...s,
      ownerId,
      sortOrder: maxSortOrder + 1 + i,
    }));
    await db.insert(blogSources).values(rows);
    console.log(
      `Inserted ${rows.length} new sources (sort_order ${maxSortOrder + 1}~${maxSortOrder + rows.length}):`,
    );
    for (const r of rows) console.log(`  + ${r.name}  ${r.rssUrl}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
