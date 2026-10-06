'use server';

import { cookies, headers } from 'next/headers';
import { signSession } from '@/lib/session';

// In-memory registry to block brute force login attempts
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

/**
 * Validates the admin password and sets an HTTP-only session cookie.
 */
export async function login(password: string) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  const now = Date.now();

  // Check if IP is currently blocked
  const record = loginAttempts.get(ip);
  if (record && record.blockedUntil > now) {
    const secondsLeft = Math.ceil((record.blockedUntil - now) / 1000);
    return { error: `Too many login attempts. Please try again in ${secondsLeft} seconds.` };
  }

  const adminPassword = process.env.ADMIN_PASSWORD || 'pathologyadmin';

  if (password !== adminPassword) {
    const attempts = record ? record.count + 1 : 1;
    if (attempts >= 5) {
      loginAttempts.set(ip, { count: attempts, blockedUntil: now + 5 * 60 * 1000 }); // Block for 5 minutes
      return { error: 'Invalid admin credentials. Too many failed attempts. You have been blocked for 5 minutes.' };
    } else {
      loginAttempts.set(ip, { count: attempts, blockedUntil: 0 });
      return { error: `Invalid admin credentials. Attempt ${attempts} of 5.` };
    }
  }

  // Clear failed login attempts upon successful authentication
  loginAttempts.delete(ip);

  // Generate a cryptographically signed session token valid for 24 hours
  const expiresAt = now + 1000 * 60 * 60 * 24;
  // Never the licence salt: it ships inside every desktop install, so anyone could forge a session.
  const signingSecret = process.env.SESSION_SECRET || adminPassword;
  
  const token = await signSession({ expiresAt }, signingSecret);

  const cookieStore = await cookies();
  cookieStore.set('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day session
    path: '/',
  });

  return { success: true };
}

/**
 * Destroys the admin session cookie and logs out.
 */
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('admin_session');
  return { success: true };
}
