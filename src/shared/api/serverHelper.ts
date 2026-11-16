import { NextRequest, NextResponse } from 'next/server';
import { refreshAdminSession } from '../auth/serverTokenRefresh';

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8001/api/v1';

export function getBackendAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const val = authHeader.substring(7).trim();
    if (val && val !== 'null' && val !== 'undefined') {
      return val;
    }
  }
  const cookieToken = request.cookies.get('admin_access_token')?.value;
  if (cookieToken && cookieToken !== 'null' && cookieToken !== 'undefined') {
    return cookieToken;
  }
  return null;
}

export async function forwardBackendRequest(
  request: NextRequest,
  backendPath: string,
  options: RequestInit = {}
): Promise<Response> {
  let token = getBackendAuthToken(request);
  const refreshToken = request.cookies.get('admin_refresh_token')?.value;
  let refreshedTokens: { accessToken: string; refreshToken?: string } | null = null;

  // If token is missing, attempt auto-refresh on the server using admin_refresh_token cookie
  if (!token && refreshToken) {
    const refreshRes = await refreshAdminSession(refreshToken);
    if (refreshRes?.accessToken) {
      token = refreshRes.accessToken;
      refreshedTokens = refreshRes;
    }
  }

  // Development auto-auth fallback so admin requests never fail in local dev.
  // Opt-in and hard-disabled in production — never ship a fallback login.
  const devAutoAuthEnabled =
    process.env.NODE_ENV !== 'production' && process.env.ADMIN_DEV_AUTO_AUTH === 'true';
  const devEmail = process.env.ADMIN_DEV_EMAIL;
  const devPassword = process.env.ADMIN_DEV_PASSWORD;

  if (!token && devAutoAuthEnabled && devEmail && devPassword) {
    try {
      const loginRes = await fetch(`${API_URL}/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: devEmail, password: devPassword }),
      });
      if (loginRes.ok) {
        const loginJson = await loginRes.json();
        token = loginJson.data?.access_token || loginJson.access_token || null;
      }
    } catch (err) {
      console.error('Dev auto-auth fallback failed:', err);
    }
  }

  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin access token missing or expired' },
      { status: 401 }
    );
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!headers.has('Content-Type') && options.method && options.method !== 'GET' && !isFormData) {
    headers.set('Content-Type', 'application/json');
  }

  const url = `${API_URL}${backendPath.startsWith('/') ? backendPath : `/${backendPath}`}`;
  let backendRes = await fetch(url, {
    ...options,
    headers,
  });

  // If the backend returned 401 (e.g. access token expired during session)
  // and we have a valid refresh token cookie, refresh once and retry!
  if (backendRes.status === 401 && refreshToken) {
    const retryRefresh = await refreshAdminSession(refreshToken);
    if (retryRefresh?.accessToken) {
      refreshedTokens = retryRefresh;
      token = retryRefresh.accessToken;
      headers.set('Authorization', `Bearer ${token}`);
      backendRes = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  if (refreshedTokens) {
    (backendRes as any)._refreshedTokens = refreshedTokens;
  }

  return backendRes;
}

/**
 * Forward a backend response to the client without choking on empty bodies
 * (DRF returns 204 No Content for DELETE, which breaks `res.json()`).
 * Also propagates refreshed auth cookies if auto-refreshed on the server.
 */
export async function forwardJsonResponse(res: Response): Promise<NextResponse> {
  const text = await res.text();
  let nextRes: NextResponse;

  if (!text) {
    nextRes = new NextResponse(null, { status: res.status });
  } else {
    try {
      nextRes = NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      nextRes = new NextResponse(text, { status: res.status });
    }
  }

  const tokens = (res as any)._refreshedTokens;
  if (tokens?.accessToken) {
    nextRes.cookies.set('admin_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });
    if (tokens.refreshToken) {
      nextRes.cookies.set('admin_refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
      nextRes.cookies.set('admin_session', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
    }
  }

  return nextRes;
}
