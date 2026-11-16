import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/ai/queue/', { method: 'GET' });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Failed to load the review queue' },
      { status: 500 }
    );
  }
}
