import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { verifySessionToken } from '../lib/jwt.js';

/** Guards every admin route. Public form endpoints deliberately do not use this. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME];

  if (typeof token !== 'string' || token.length === 0) {
    next(AppError.unauthorized());
    return;
  }

  const claims = verifySessionToken(token);
  if (!claims) {
    next(AppError.unauthorized('Your session has expired. Please sign in again.'));
    return;
  }

  req.user = { id: claims.userId, email: claims.email };
  next();
};
