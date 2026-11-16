import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../shared/api/serverHelper';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const res = await forwardBackendRequest(
      request,
      `/admin/promotions/banners/${id}/`,
      { method: 'GET' }
    );

    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch banner' },
      { status: 500 }
    );
  }
}

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

    const res = await forwardBackendRequest(
      request,
      `/admin/promotions/banners/${id}/`,
      options
    );

    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update banner' },
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
    const res = await forwardBackendRequest(
      request,
      `/admin/promotions/banners/${id}/`,
      { method: 'DELETE' }
    );

    if (res.status === 204) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    const text = await res.text();
    let data: any = { success: true };
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete banner' },
      { status: 500 }
    );
  }
}
