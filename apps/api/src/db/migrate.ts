import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

config({ path: resolve(__dirname, '../../../../.env') });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Check the root .env file.');
  }

  const migrationClient = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  const db = drizzle(migrationClient);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: resolve(__dirname, '../../drizzle') });
  console.log('Migrations applied.');

  await migrationClient.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
