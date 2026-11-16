import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/ai/reveal/', { method: 'GET' });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reveal the API key' },
      { status: 500 }
    );
  }
}
