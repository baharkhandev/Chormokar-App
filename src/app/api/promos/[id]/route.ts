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
      const formData = await request.formData();
      options.body = formData;
    } else {
      const body = await request.json();
      options.body = JSON.stringify(body);
    }

    const res = await forwardBackendRequest(request, `/admin/promotions/popups/${id}/`, options);

    return forwardJsonResponse(res);
  } catch (error: any) {
    console.error('Error updating promo popup:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update promo popup' },
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
    const res = await forwardBackendRequest(request, `/admin/promotions/popups/${id}/`, {
      method: 'DELETE',
    });

    return forwardJsonResponse(res);
  } catch (error: any) {
    console.error('Error deleting promo popup:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete promo popup' },
      { status: 500 }
    );
  }
}
