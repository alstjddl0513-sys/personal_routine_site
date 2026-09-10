import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '../../.env') });

// Fail fast when auth is silently disabled in prod. SupabaseAuthGuard's
// "no env → no-op" fallback is a dev convenience; letting it flow through
// to production would open the entire API. Runs immediately on import so
// nothing else in main.ts can start first.
if (process.env.NODE_ENV === 'production' && !process.env.SUPABASE_URL) {
  throw new Error(
    'SUPABASE_URL is required in production — refusing to boot with auth disabled.',
  );
}
