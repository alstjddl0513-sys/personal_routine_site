import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, isAuthConfigured, verifyAuthCookie } from '@/lib/auth-cookie';

// Cookie-based session guard for the whole app. When BASIC_AUTH_USER/PASSWORD
// are unset the guard is a no-op so local dev needs no extra config. Once
// enabled, unauthenticated page requests redirect to /login (preserving the
// original path via `next`), while unauthenticated API requests return 401
// JSON so client fetches can handle the failure without a full navigation.
//
// Next.js 16 renamed the middleware file convention to "proxy" (the export
// name follows suit).

// Paths that must be reachable without a session — the login flow itself
// plus the safety-net unauthorized page.
const PUBLIC_PATHS = ['/login', '/unauthorized', '/api/auth/login'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(req: NextRequest) {
  if (!isAuthConfigured()) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (verifyAuthCookie(cookie)) return NextResponse.next();

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
