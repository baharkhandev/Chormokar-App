import { NextResponse } from 'next/server';

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000/api/v1';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const resJson = await response.json();

    if (!response.ok) {
      const errorMsg =
        resJson?.error?.message ||
        resJson?.detail ||
        resJson?.message ||
        'Invalid credentials';
      return NextResponse.json({ error: errorMsg }, { status: response.status });
    }

    const payload = resJson.data || resJson;
    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;
    const user = payload.user;

    // AUTHORIZATION ENFORCEMENT: Staff/Superuser ONLY!
    if (!user || (!user.is_staff && !user.is_superuser)) {
      return NextResponse.json(
        {
          error:
            'Access denied: You do not have administrator privileges to access this dashboard.',
        },
        { status: 403 }
      );
    }

    const nextResponse = NextResponse.json({
      accessToken,
      user,
    });

    if (accessToken) {
      nextResponse.cookies.set('admin_access_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });
    }

    if (refreshToken) {
      nextResponse.cookies.set('admin_refresh_token', refreshToken, {
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
