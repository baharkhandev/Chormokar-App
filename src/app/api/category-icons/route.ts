import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../shared/api/serverHelper';

/** List icons uploaded to the shared category-icon library. */
export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/catalog/category-icons/', {
      method: 'GET',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load category icons' },
      { status: 500 }
    );
  }
}

/** Upload a pasted/dropped icon (multipart: `image`, optional `name`). */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const image = form.get('image');

    if (!image || typeof image === 'string') {
      return NextResponse.json({ error: 'An image file is required' }, { status: 400 });
    }

    const res = await forwardBackendRequest(request, '/admin/catalog/category-icons/', {
      method: 'POST',
      body: form,
    });

    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload category icon' },
      { status: 500 }
    );
  }
}
