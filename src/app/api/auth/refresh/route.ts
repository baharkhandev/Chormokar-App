import { NextRequest, NextResponse } from 'next/server';
import { refreshAdminSession } from '../../../../shared/auth/serverTokenRefresh';

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const refreshToken =
      request.cookies.get('admin_refresh_token')?.value ||
      body?.refresh_token ||
      body?.refreshToken;

    if (!refreshToken) {
      const res = NextResponse.json(
        { error: 'No admin refresh token provided' },
        { status: 401 }
      );
      res.cookies.delete('admin_access_token');
      res.cookies.delete('admin_refresh_token');
      res.cookies.delete('admin_session');
      return res;
    }

    const refreshResult = await refreshAdminSession(refreshToken);

    if (!refreshResult) {
      const res = NextResponse.json(
        { error: 'Admin session expired or invalid' },
        { status: 401 }
      );
      res.cookies.delete('admin_access_token');
      res.cookies.delete('admin_refresh_token');
      res.cookies.delete('admin_session');
      return res;
    }

    const nextResponse = NextResponse.json({
      accessToken: refreshResult.accessToken,
      user: refreshResult.user,
    });

    // Set admin_access_token cookie (15 min TTL)
    nextResponse.cookies.set('admin_access_token', refreshResult.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    if (refreshResult.refreshToken) {
      nextResponse.cookies.set('admin_refresh_token', refreshResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
      nextResponse.cookies.set('admin_session', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    return nextResponse;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
