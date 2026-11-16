import { NextRequest, NextResponse } from 'next/server';
import { getBackendAuthToken } from '../../../../../shared/api/serverHelper';
import { refreshAdminSession } from '../../../../../shared/auth/serverTokenRefresh';

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000/api/v1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.text();

  let token = getBackendAuthToken(request);
  const refreshToken = request.cookies.get('admin_refresh_token')?.value;

  if (!token && refreshToken) {
    const refreshed = await refreshAdminSession(refreshToken);
    token = refreshed?.accessToken || null;
  }

  if (!token) {
    return NextResponse.json(
      { detail: 'Unauthorized: admin session missing or expired' },
      { status: 401 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/admin/ai/chat/stream/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body,
      cache: 'no-store',
    });
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Could not reach the assistant' },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return new NextResponse(text || JSON.stringify({ detail: 'Stream failed' }), {
      status: upstream.status || 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pipe the SSE body straight through — no buffering, no transformation.
  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    },
  });
}
