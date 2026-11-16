import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams();
    const fresh = request.nextUrl.searchParams.get('fresh');
    const presetId = request.nextUrl.searchParams.get('preset_id');
    if (fresh) params.set('fresh', '1');
    if (presetId) params.set('preset_id', presetId);
    const query = params.toString();
    const res = await forwardBackendRequest(
      request,
      `/admin/ai/gateway-usage/${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load gateway credits' },
      { status: 500 }
    );
  }
}
