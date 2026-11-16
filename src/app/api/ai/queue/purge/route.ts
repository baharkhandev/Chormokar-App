import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../shared/api/serverHelper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const res = await forwardBackendRequest(request, '/admin/ai/queue/purge/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body || '{}',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Could not delete the queue' },
      { status: 500 }
    );
  }
}
