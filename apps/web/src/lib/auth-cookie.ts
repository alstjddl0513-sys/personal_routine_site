// Session cookie for form-based login. Value is base64(user:pass) so it's
// tied to the current env creds — rotating BASIC_AUTH_* invalidates all
// existing cookies without needing a separate secret store. Same security
// posture as the previous HTTP Basic Auth flow, just moved from the
// Authorization header to an HttpOnly cookie.

export const AUTH_COOKIE_NAME = 'rally-auth';

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function toBase64(input: string): string {
  if (typeof btoa !== 'undefined') return btoa(input);
  return Buffer.from(input, 'utf-8').toString('base64');
}

export function buildAuthCookieValue(user: string, pass: string): string {
  return toBase64(`${user}:${pass}`);
}

export function expectedAuthCookieValue(): string | null {
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !pass) return null;
  return buildAuthCookieValue(user, pass);
}

export function verifyAuthCookie(value: string | undefined): boolean {
  const expected = expectedAuthCookieValue();
  if (!expected) return true; // auth disabled server-side
  if (!value) return false;
  return value === expected;
}

export function isAuthConfigured(): boolean {
  return !!(process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD);
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  };
}
