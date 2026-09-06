import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

/**
 * In-memory store — correct because the API runs as a single PM2 process. If this were
 * ever scaled to cluster mode the counters would diverge per worker and would need to
 * move to Redis.
 */
const baseOptions: Partial<Options> = {
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(AppError.tooManyRequests()),
};

/** Broad backstop against runaway clients. */
export const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  skip: (req) => req.path === '/health',
});

/** Credential stuffing / brute force protection. Counts only failed attempts. */
export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60_000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  handler: (_req, _res, next) =>
    next(AppError.tooManyRequests('Too many login attempts. Try again in a few minutes.')),
});

/** The public form is unauthenticated, so it needs its own tighter budget. */
export const publicLeadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60_000,
  limit: env.PUBLIC_LEAD_RATE_LIMIT_MAX,
  handler: (_req, _res, next) =>
    next(AppError.tooManyRequests('Too many submissions from this address.')),
});
