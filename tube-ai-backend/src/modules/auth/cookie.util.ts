import { Response } from 'express';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

// Refresh cookie is scoped to the auth path so it's only ever sent to /auth/*.
const REFRESH_PATH = '/api/v1/auth';
const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 min
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const COOKIE_NAMES = { ACCESS_COOKIE, REFRESH_COOKIE };

/**
 * Both tokens live in httpOnly cookies (§47.2) — never in JS-readable storage.
 * SameSite=Lax assumes app + API share a parent domain in prod; switch to 'none'
 * (with CSRF tokens) only if you deploy them cross-site.
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  isProd: boolean,
): void {
  const base = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
  };
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...base,
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...base,
    path: REFRESH_PATH,
    maxAge: REFRESH_MAX_AGE,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: '/' });
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
}
