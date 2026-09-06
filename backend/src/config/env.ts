import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment is parsed once, at import time. If anything is missing or malformed
 * the process exits before it can accept a single request — a misconfigured server
 * that boots "successfully" and then 500s on the first login is far worse.
 */
const toBoolean = (value: string | undefined) => value === 'true' || value === '1';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4400),
    // Bound to loopback in production so the API is unreachable from outside the
    // host, even if the firewall would otherwise allow its port.
    HOST: z.string().default('0.0.0.0'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_IN: z.string().default('7d'),

    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    COOKIE_NAME: z.string().default('ldp_session'),
    COOKIE_SECURE: z.string().optional().transform(toBoolean),
    TRUST_PROXY: z.coerce.number().int().min(0).default(1),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    PUBLIC_LEAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production' && value.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be at least 32 characters in production',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';
