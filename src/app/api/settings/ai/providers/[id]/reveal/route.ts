import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../../../shared/api/serverHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await forwardBackendRequest(
      request,
      `/admin/ai/providers/${id}/reveal/`,
      { method: 'GET' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not read the saved key' },
      { status: 500 }
    );
  }
}
