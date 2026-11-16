import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ detail: 'Upload the image as multipart/form-data.' }, { status: 400 });
    }
    const body = await request.arrayBuffer();
    const res = await forwardBackendRequest(request, '/admin/ai/uploads/', {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Failed to upload the image' },
      { status: 500 }
    );
  }
}
