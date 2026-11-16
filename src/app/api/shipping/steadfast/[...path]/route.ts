import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../shared/api/serverHelper';

/**
 * Proxy all Steadfast admin calls to Django:
 *   /api/shipping/steadfast/<path> -> /admin/shipping/steadfast/<path>/
 */
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;
    const suffix = (path || []).filter(Boolean).join('/');
    const query = request.nextUrl.searchParams.toString();
    const backendPath = `/admin/shipping/steadfast/${suffix}/${query ? `?${query}` : ''}`;

    const options: RequestInit = { method: request.method };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        options.body = body;
        options.headers = { 'Content-Type': 'application/json' };
      }
    }

    const res = await forwardBackendRequest(request, backendPath, options);
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Steadfast request failed' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}
