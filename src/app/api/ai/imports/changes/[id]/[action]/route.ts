import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../../../shared/api/serverHelper';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await params;
    const body = await request.text();
    const res = await forwardBackendRequest(
      request,
      `/admin/ai/imports/changes/${id}/${action}/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body || '{}',
      }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Failed to update the proposal' },
      { status: 500 }
    );
  }
}
