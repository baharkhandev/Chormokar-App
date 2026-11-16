import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../shared/api/serverHelper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await forwardBackendRequest(request, '/admin/ai/test-bulk/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to run the bulk test' },
      { status: 500 }
    );
  }
}
