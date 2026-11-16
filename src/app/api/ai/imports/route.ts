import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/ai/imports/', { method: 'GET' });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Failed to load import batches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ detail: 'Upload the sheet as multipart/form-data.' }, { status: 400 });
    }

    const body = await request.arrayBuffer();
    const res = await forwardBackendRequest(request, '/admin/ai/imports/', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Failed to parse the sheet' },
      { status: 500 }
    );
  }
}
