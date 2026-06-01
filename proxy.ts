import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Computes the SHA-256 hash of a string using Web Crypto (Edge-safe).
 */
async function getExpectedToken(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

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
  const expectedToken = await getExpectedToken(adminPassword);

  const session = request.cookies.get('admin_session')?.value;
  const isAuthenticated = session === expectedToken;

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
