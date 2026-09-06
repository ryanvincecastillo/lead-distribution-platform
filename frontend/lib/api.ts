import type { PageMeta } from './types';

export interface FieldIssue {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: FieldIssue[];

  constructor(status: number, code: string, message: string, issues: FieldIssue[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

interface Envelope<T> {
  data: T;
  meta?: PageMeta;
}

/**
 * All browser traffic goes to this app's own /api path, which proxies to the private
 * Express port server-side. Cookies are same-origin as a result, so the session cookie
 * stays httpOnly and no CORS negotiation is involved.
 */
const request = async <T>(path: string, init?: RequestInit): Promise<Envelope<T>> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) return { data: undefined as T };

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? 'Something went wrong. Please try again.',
      Array.isArray(error?.details) ? error.details : [],
    );
  }

  return payload as Envelope<T>;
};

export const api = {
  get: <T>(path: string) => request<T>(path).then((body) => body.data),
  getPage: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }).then((r) => r.data),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }).then((r) => r.data),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }).then((r) => r.data),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }).then((r) => r.data),
};
