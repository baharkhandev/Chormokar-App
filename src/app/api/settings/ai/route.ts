import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/ai/settings/', { method: 'GET' });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load AI settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await forwardBackendRequest(request, '/admin/ai/settings/', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update AI settings' },
      { status: 500 }
    );
  }
}
