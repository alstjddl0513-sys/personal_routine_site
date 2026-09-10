import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Called from proxy.ts on every guarded request. Reads the incoming session
// cookie, refreshes it if expired, and returns both the resolved user and a
// response with any updated Set-Cookie headers. The caller is responsible
// for the auth decision (redirect / 401 / passthrough) using the returned
// user.
//
// The helper file is named `middleware.ts` to match Supabase's official
// Next.js SSR docs; the Next 16 file convention that consumes it is
// `apps/web/src/proxy.ts`.

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { response, user: null, configured: false } as const;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() forces a server-side re-verification of the JWT (unlike
  // getSession which trusts the cookie). Do not remove — required for
  // security per Supabase SSR docs.
  const { data } = await supabase.auth.getUser();

  return { response, user: data.user, configured: true } as const;
}
