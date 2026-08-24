import { NextRequest } from 'next/server';

// Server-side proxy so client-side mutations never see the API access token.
// SSR fetches skip this route (see lib/api.ts — they hit the upstream directly).

const UPSTREAM = process.env.API_INTERNAL_URL ?? 'http://localhost:3001';
const TOKEN = process.env.API_ACCESS_TOKEN;

// Headers that must NOT be forwarded upstream. host/content-length change
// per hop; the remaining ones are Next.js/Vercel-injected metadata that
// confuse Node's fetch.
const STRIP_REQ = new Set([
  'host',
  'content-length',
  'connection',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
  'x-vercel-id',
  'x-vercel-deployment-url',
  'x-vercel-forwarded-for',
]);

// Response headers to drop — hop-by-hop or ones that break Next.js streaming.
const STRIP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding']);

async function handle(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const { path } = await ctx.params;
  const search = req.nextUrl.search;
  const upstreamUrl = `${UPSTREAM}/${path.join('/')}${search}`;

  const headers = new Headers();
  for (const [k, v] of req.headers) {
    if (!STRIP_REQ.has(k.toLowerCase())) headers.set(k, v);
  }
  if (TOKEN) headers.set('x-auth-token', TOKEN);

  const body =
    req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body,
    cache: 'no-store',
  });

  const outHeaders = new Headers();
  for (const [k, v] of upstreamRes.headers) {
    if (!STRIP_RES.has(k.toLowerCase())) outHeaders.set(k, v);
  }

  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: outHeaders,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
