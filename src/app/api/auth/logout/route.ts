import { NextRequest, NextResponse } from 'next/server';

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000/api/v1';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    const refreshToken = request.cookies.get('admin_refresh_token')?.value;

    await fetch(`${API_URL}/auth/logout/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(refreshToken ? { Cookie: `refresh_token=${refreshToken}` } : {}),
      },
    }).catch(() => {});

    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_access_token');
    response.cookies.delete('admin_refresh_token');
    response.cookies.delete('admin_session');
    return response;
  } catch {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('admin_access_token');
    response.cookies.delete('admin_refresh_token');
    response.cookies.delete('admin_session');
    return response;
  }
}
