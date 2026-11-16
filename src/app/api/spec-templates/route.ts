import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.toString();
    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/spec-templates/${query ? `?${query}` : ''}`,
      { method: 'GET' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch specification templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/catalog/spec-templates/', {
      method: 'POST',
      body: JSON.stringify(await request.json()),
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create specification template' },
      { status: 500 }
    );
  }
}
