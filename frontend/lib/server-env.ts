import 'server-only';

/**
 * The API base URL is intentionally *not* a NEXT_PUBLIC_ variable: the backend port is
 * private on the VPS, so the browser must never learn it. Every call the browser makes
 * goes to this app's own /api route, which proxies onward server-side.
 */
export const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:4000';
