import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  buildAuthCookieValue,
  getAuthCookieOptions,
  isAuthConfigured,
} from '@/lib/auth-cookie';

interface LoginBody {
  username?: unknown;
  password?: unknown;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as LoginBody | null;
  const username = typeof body?.username === 'string' ? body.username : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!isAuthConfigured()) {
    // Auth disabled server-side — accept any input as a dev convenience.
    // The cookie itself is a no-op since verifyAuthCookie also returns true
    // when env is unset. Still set the cookie so client flow is consistent.
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE_NAME, buildAuthCookieValue(username, password), getAuthCookieOptions());
    return res;
  }

  const expectedUser = process.env.BASIC_AUTH_USER!;
  const expectedPass = process.env.BASIC_AUTH_PASSWORD!;

  if (username !== expectedUser || password !== expectedPass) {
    return NextResponse.json(
      { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, buildAuthCookieValue(username, password), getAuthCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE_NAME);
  return res;
}
