import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../../shared/api/serverHelper';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await context.params;
    const body = await request.json();
    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/products/${id}/images/${imageId}/`,
      { method: 'PATCH', body: JSON.stringify(body) }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await context.params;
    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/products/${id}/images/${imageId}/`,
      { method: 'DELETE' }
    );
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete image' },
      { status: 500 }
    );
  }
}
