import { NextRequest, NextResponse } from 'next/server';
import { updateSupabaseSession } from '@/lib/supabase/middleware';

// Session guard for the whole app. When Supabase env is unset the guard is
// a no-op so local dev needs no extra config. Once enabled, unauthenticated
// page requests redirect to /login (preserving the original path via
// `next`), while unauthenticated API requests return 401 JSON so client
// fetches can handle the failure without a full navigation.
//
// Next.js 16 renamed the middleware file convention to "proxy" (the export
// name follows suit).

// Paths that must be reachable without a session — the auth flow itself,
// the safety-net unauthorized page, and the pre-signup nickname check.
// /api/proxy/profiles/check-nickname corresponds to the API's @Public()
// GET /profiles/check-nickname — both layers must let it through.
const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/unauthorized',
  '/auth/callback',
  '/api/proxy/profiles/check-nickname',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(req: NextRequest) {
  const { response, user, configured } = await updateSupabaseSession(req);
  if (!configured) return response;

  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) return response;
  if (user) return response;

  // API requests: return JSON so client fetches don't try to render HTML.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Page requests: redirect to the login form and remember where they came from.
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip Next.js internals and static assets so the guard only runs for
  // real pages and API routes.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)'],
};
