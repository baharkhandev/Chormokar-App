import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const res = await forwardBackendRequest(request, `/admin/orders/${id}/`, {
      method: 'GET',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch order' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const res = await forwardBackendRequest(request, `/admin/orders/${id}/status/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
