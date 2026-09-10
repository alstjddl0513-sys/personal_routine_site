import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client. Reads env at call time so the same helper
// works in both server-rendered client components (values inlined by Next)
// and hydrated browser code. Uses the new publishable key structure — the
// value is safe to expose because RLS policies (Phase 12.4) enforce access.

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }
  return createBrowserClient(url, key);
}
