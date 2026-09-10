// Runs once per Next.js server instance startup. Used here purely to
// fail fast when Supabase env is missing in production — otherwise the
// proxy.ts guard would silently no-op and let unauthenticated requests
// pass through.

export function register() {
  if (process.env.NODE_ENV !== 'production') return;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required in production — refusing to boot with auth disabled.',
    );
  }
}
