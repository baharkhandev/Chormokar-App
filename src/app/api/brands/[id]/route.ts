import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const contentType = request.headers.get('content-type') || '';
    const options: RequestInit = { method: 'PATCH' };
    if (contentType.includes('multipart/form-data')) {
      options.body = await request.formData();
    } else {
      options.body = JSON.stringify(await request.json());
    }

    const res = await forwardBackendRequest(request, `/admin/catalog/brands/${id}/`, options);
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update brand' },
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
    const res = await forwardBackendRequest(request, `/admin/catalog/brands/${id}/`, {
      method: 'DELETE',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete brand' },
      { status: 500 }
    );
  }
}
