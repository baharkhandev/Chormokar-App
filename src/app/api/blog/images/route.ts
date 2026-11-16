import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const options: RequestInit = { method: 'POST' };

    if (contentType.includes('multipart/form-data')) {
      options.body = await request.formData();
    } else {
      return NextResponse.json(
        { error: 'Upload the image as multipart form data.' },
        { status: 400 }
      );
    }

    const res = await forwardBackendRequest(request, '/admin/blog/images/', options);
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
