import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/session';

/**
 * Next.js 16 Proxy Router for securing administrative routes.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let static assets and icons pass through
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD || 'pathologyadmin';
  // Never the licence salt: it ships inside every desktop install, so anyone could forge a session.
  const signingSecret = process.env.SESSION_SECRET || adminPassword;

  const session = request.cookies.get('admin_session')?.value;
  
  let isAuthenticated = false;
  if (session) {
    const payload = await verifySession(session, signingSecret);
    if (payload) {
      isAuthenticated = true;
    }
  }

  // 1. Unauthenticated users trying to access dashboard should be redirected to login (/)
  if (pathname.startsWith('/dashboard') && !isAuthenticated) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users visiting the login screen (/) should be redirected to the dashboard
  if (pathname === '/' && isAuthenticated) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/dashboard/:path*'],
};
