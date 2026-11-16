import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString();
    const res = await forwardBackendRequest(
      request,
      `/admin/orders/${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await forwardBackendRequest(request, '/admin/orders/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
