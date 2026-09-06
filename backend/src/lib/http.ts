import type { Request } from 'express';
import { z } from 'zod';

/** Every successful response is `{ data }`, optionally with `{ meta }` for lists. */
export const ok = <T>(data: T) => ({ data });

export const paginated = <T>(items: T[], total: number, page: number, pageSize: number) => ({
  data: items,
  meta: {
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  },
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/** Reads the validated query stashed by the validate() middleware. */
export const validatedQuery = <T>(res: { locals: { query?: unknown } }): T => res.locals.query as T;

/**
 * Express resolves req.ip through the configured trust proxy hop count, so this is the
 * real visitor address rather than the proxy's. IPv4-mapped IPv6 (::ffff:1.2.3.4) is
 * unwrapped because storing the mapped form makes leads from the same visitor look
 * different depending on which stack the connection used.
 */
export const clientIp = (req: Request): string => {
  const raw = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return raw.startsWith('::ffff:') ? raw.slice(7) : raw;
};
