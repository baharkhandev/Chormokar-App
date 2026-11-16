import { cookies } from 'next/headers';

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8001/api/v1';

/**
 * Fetch from Django inside a server component using the admin access cookie.
 *
 * Deliberately does NOT rotate the refresh token: Django revokes a refresh
 * family on reuse, and a server component cannot write the rotated cookies
 * back, which would sign the admin out. If the access token is missing or
 * expired we return null and the client fetches (and refreshes) normally.
 */
export async function serverApiGet<T>(path: string): Promise<T | null> {
  try {
    const store = await cookies();
    const token = store.get('admin_access_token')?.value || '';
    if (!token || token === 'null' || token === 'undefined') return null;

    const url = `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const json = await res.json();
    return (json?.data ?? json) as T;
  } catch {
    return null;
  }
}
