import 'server-only';
import { cookies, headers } from 'next/headers';
import type { Project } from '@/types';

const COOKIE_NAME = 'factory_uid';

const newUid = () =>
  'u_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-6);

/**
 * Returns the caller's user id from the request (`x-factory-user` header for tests
 * or `factory_uid` httpOnly cookie for browsers). When `createIfMissing` is true
 * (on write routes), sets the cookie if not present yet.
 */
export async function getSessionUserId(opts: { createIfMissing?: boolean } = {}): Promise<string> {
  try {
    const h = await headers();
    const fromHeader = h.get('x-factory-user')?.trim();
    if (fromHeader && /^[a-zA-Z0-9_-]{2,64}$/.test(fromHeader)) {
      return fromHeader;
    }
    const jar = await cookies();
    const existing = jar.get(COOKIE_NAME)?.value;
    if (existing && /^[a-zA-Z0-9_-]{2,64}$/.test(existing)) {
      return existing;
    }
    if (opts.createIfMissing) {
      const uid = newUid();
      try {
        jar.set(COOKIE_NAME, uid, {
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
        });
      } catch {
        // Ignore if called in a context where response headers are immutable.
      }
      return uid;
    }
  } catch {
    // Called outside a Next.js request scope.
  }
  return 'local';
}

export { canAccessProject } from '@/lib/ecc-core';
