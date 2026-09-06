import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'ldp_session';

const PROTECTED_PREFIXES = ['/dashboard', '/brokers', '/form', '/distribution', '/leads'];

/**
 * A cheap gate that keeps unauthenticated visitors out of the admin shell. It only checks
 * that a session cookie exists — the API is the actual authority and re-verifies the JWT
 * on every request, so the signing secret never needs to leave the backend.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/brokers/:path*', '/form', '/distribution/:path*', '/leads/:path*', '/login'],
};
