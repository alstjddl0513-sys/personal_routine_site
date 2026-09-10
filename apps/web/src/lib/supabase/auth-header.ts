'use server';

import { createSupabaseServerClient } from './server';

// Server Action wrapping the session lookup. When imported by client code,
// Next replaces the reference with an RPC stub — actual server-only imports
// (next/headers via createSupabaseServerClient) stay out of the browser
// bundle. Server-side callers (SSR fetches in lib/api.ts) get a direct
// in-process call, no HTTP hop.
//
// Returns null when Supabase env is unset (dev without auth configured, or
// build-time prerender) so the caller can skip attaching the header — the
// API's SupabaseAuthGuard mirrors this by staying inactive when SUPABASE_URL
// is unset.
export async function getServerAuthorizationHeader(): Promise<string | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ? `Bearer ${session.access_token}` : null;
}
