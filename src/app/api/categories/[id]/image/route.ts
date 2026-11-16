import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../shared/api/serverHelper';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const form = await request.formData();
    const image = form.get('image');

    if (!image || typeof image === 'string') {
      return NextResponse.json({ error: 'An image file is required' }, { status: 400 });
    }

    const res = await forwardBackendRequest(request, `/admin/catalog/categories/${id}/image/`, {
      method: 'POST',
      body: form,
    });

    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload category image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const res = await forwardBackendRequest(request, `/admin/catalog/categories/${id}/image/`, {
      method: 'DELETE',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to remove category image' },
      { status: 500 }
    );
  }
}
