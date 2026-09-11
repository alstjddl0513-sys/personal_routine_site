import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../../.env') });

// Apply a single .sql file to $DATABASE_URL. Bypasses Drizzle's tracking
// (no __drizzle_migrations INSERT). Use when a Drizzle migration needs to
// be replayed out-of-band and you'll write the tracking row yourself.
//
//   $env:DATABASE_URL = "<pooler-url>"
//   pnpm --filter api exec tsx src/db/apply-sql-file.ts drizzle/<file>.sql

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');

  const relPath = process.argv[2];
  if (!relPath) {
    throw new Error(
      'Usage: tsx src/db/apply-sql-file.ts <path-relative-to-apps/api>',
    );
  }

  const absPath = resolve(__dirname, '../../', relPath);
  const raw = readFileSync(absPath, 'utf8');
  const sql = raw.replace(/-->\s*statement-breakpoint/g, '');

  console.log(`Applying ${absPath} to $DATABASE_URL...`);
  const client = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  try {
    await client.unsafe(sql);
    console.log('Applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
