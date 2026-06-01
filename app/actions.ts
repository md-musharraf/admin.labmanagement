'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * Validates the admin password and sets an HTTP-only session cookie.
 */
export async function login(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'pathologyadmin';

  if (password !== adminPassword) {
    return { error: 'Invalid admin credentials' };
  }

  // Generate SHA-256 hash of the password as the session token
  const token = crypto.createHash('sha256').update(adminPassword).digest('hex');

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
