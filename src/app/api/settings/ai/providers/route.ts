import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/ai/providers/', {
      method: 'GET',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load saved providers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await forwardBackendRequest(request, '/admin/ai/providers/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to save provider' },
      { status: 500 }
    );
  }
}
