import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../../.env') });

// Ad-hoc: apply a single .sql file to $DATABASE_URL.
// Written for Phase 12.4 prod recovery — Supabase SQL Editor was mangling
// paste of the 0011 FK block, so we bypass the browser and stream the file
// straight into Postgres. Reused whenever a single migration file needs
// to be applied out-of-band.
//
// Usage:
//   $env:DATABASE_URL = "<prod-pooler-url>"
//   pnpm.cmd --filter api exec tsx src/db/apply-sql-file.ts drizzle/0011_easy_squirrel_girl.sql

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

  // Drizzle uses `--> statement-breakpoint` as a splitter; strip it and
  // then run the whole file as a single transaction.
  const sql = raw.replace(/-->\s*statement-breakpoint/g, '');

  console.log(`Applying ${absPath} to prod DB...`);
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
