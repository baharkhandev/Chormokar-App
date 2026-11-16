import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../../../shared/api/serverHelper';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await forwardBackendRequest(
      request,
      `/admin/ai/providers/${id}/activate/`,
      { method: 'POST' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to switch provider' },
      { status: 500 }
    );
  }
}
