import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, getBackendAuthToken } from '../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/users/me/', { method: 'GET' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: json?.detail || json?.error || 'Session expired' },
        { status: res.status }
      );
    }

    const tokens = (res as any)._refreshedTokens;
    const accessToken = tokens?.accessToken || getBackendAuthToken(request) || '';
    const user = json?.data ?? json;
    const next = NextResponse.json({ accessToken, user });

    if (tokens?.accessToken) {
      next.cookies.set('admin_access_token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
      if (tokens.refreshToken) {
        next.cookies.set('admin_refresh_token', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 30 * 24 * 60 * 60,
        });
      }
    }

    return next;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not read the session' },
      { status: 500 }
    );
  }
}
