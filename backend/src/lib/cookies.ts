import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * httpOnly so no script can read the session, sameSite=lax so it survives normal
 * navigation but is not attached to cross-site form posts, secure whenever served
 * over TLS.
 */
const baseCookie: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.COOKIE_SECURE,
  path: '/',
};

export const setSessionCookie = (res: Response, token: string): void => {
  res.cookie(env.COOKIE_NAME, token, { ...baseCookie, maxAge: SEVEN_DAYS_MS });
};

export const clearSessionCookie = (res: Response): void => {
  res.clearCookie(env.COOKIE_NAME, baseCookie);
};
