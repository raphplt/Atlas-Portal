import { CookieOptions, Response } from 'express';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ACCESS_COOKIE = 'atlas.access';
const REFRESH_COOKIE = 'atlas.refresh';

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'strict' : 'lax',
    path: '/',
  };
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessMaxAgeSeconds: number,
  refreshMaxAgeDays: number,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: accessMaxAgeSeconds * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: refreshMaxAgeDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_COOKIE, opts);
  res.clearCookie(REFRESH_COOKIE, opts);
}

export function readAccessCookie(
  cookies: Record<string, string>,
): string | undefined {
  return cookies?.[ACCESS_COOKIE];
}

export function readRefreshCookie(
  cookies: Record<string, string>,
): string | undefined {
  return cookies?.[REFRESH_COOKIE];
}
