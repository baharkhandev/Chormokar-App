import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString();
    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/products/check-duplicate/${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Could not check for duplicates' },
      { status: 500 }
    );
  }
}
