import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString();
    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/brands/${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch brands' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const options: RequestInit = { method: 'POST' };
    if (contentType.includes('multipart/form-data')) {
      options.body = await request.formData();
    } else {
      options.body = JSON.stringify(await request.json());
    }

    const res = await forwardBackendRequest(request, '/admin/catalog/brands/', options);
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create brand' },
      { status: 500 }
    );
  }
}
