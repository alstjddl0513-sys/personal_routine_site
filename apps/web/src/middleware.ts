import { NextRequest, NextResponse } from 'next/server';

// HTTP Basic Auth for the whole app. Inactive when BASIC_AUTH_USER/PASSWORD
// are unset so local dev needs no extra config. Same-origin fetches from the
// browser will carry the credentials automatically, so /api/proxy/... works
// once the user has authenticated the initial page load.
export function middleware(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASSWORD;
  if (!expectedUser || !expectedPass) return NextResponse.next();

  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    const sep = decoded.indexOf(':');
    if (sep !== -1) {
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === expectedUser && p === expectedPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Rally"' },
  });
}

export const config = {
  // Skip Next.js internals and static assets so the challenge only pops for
  // real pages and API routes.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png).*)'],
};
