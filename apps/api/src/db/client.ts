import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is not set. Check the root .env file.');
}

export const queryClient = postgres(url, { prepare: false, ssl: 'require' });
export const db = drizzle(queryClient, { schema });
