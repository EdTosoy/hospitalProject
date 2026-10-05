import { ForbiddenException } from '@nestjs/common';
import type { Request, CookieOptions } from 'express';
export const SESSION_COOKIE = 'hospital_session';
export const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 3600000,
});
export function sessionCookie(request: Request): string | null {
  const entry = request.headers.cookie
    ?.split(';')
    .find((item) => item.trim().startsWith(`${SESSION_COOKIE}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.trim().slice(SESSION_COOKIE.length + 1));
  } catch {
    return null;
  }
}
export function requireBrowserOrigin(request: Request, required = true) {
  const origin = request.headers.origin;
  const allowed = (process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((value) => value.trim());
  if ((required && !origin) || (origin && !allowed.includes(origin)))
    throw new ForbiddenException('Request origin is not allowed');
}
