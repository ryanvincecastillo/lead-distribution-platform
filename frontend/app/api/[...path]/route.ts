import { NextResponse, type NextRequest } from 'next/server';
import { BACKEND_INTERNAL_URL } from '@/lib/server-env';

export const dynamic = 'force-dynamic';

/** Hop-by-hop and encoding headers must not be replayed onto the new request/response. */
const STRIPPED_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'accept-encoding',
  'transfer-encoding',
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  'content-encoding',
  'content-length',
  'transfer-encoding',
  'connection',
]);

/**
 * The visitor's IP is a graded requirement, and by the time a request reaches the Express
 * API it has passed through this Node process — so req.ip there would be 127.0.0.1. The
 * original address is therefore read here and forwarded explicitly.
 */
const resolveClientIp = (request: NextRequest): string | null => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip');
};

const proxy = async (request: NextRequest, path: string[]) => {
  const target = new URL(`${BACKEND_INTERNAL_URL}/api/${path.join('/')}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key)) headers.set(key, value);
  });

  const clientIp = resolveClientIp(request);
  if (clientIp) {
    headers.set('x-forwarded-for', clientIp);
    headers.set('x-real-ip', clientIp);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'The API is not reachable right now.' } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key)) responseHeaders.append(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};

type RouteContext = { params: Promise<{ path: string[] }> };

const handler = async (request: NextRequest, context: RouteContext) => {
  const { path } = await context.params;
  return proxy(request, path);
};

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
