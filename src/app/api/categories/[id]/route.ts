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
      `/admin/catalog/categories/${id}/`,
      { method: 'GET' }
    );

    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch category' },
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
    const body = await request.json();

    const payload: Record<string, any> = {};
    if (body.name !== undefined) payload.name = body.name.trim();
    if (body.slug !== undefined) payload.slug = body.slug.trim();
    if (body.parent !== undefined) payload.parent = body.parent || null;
    if (body.position !== undefined) payload.position = Number(body.position) || 0;
    if (body.is_active !== undefined) {
      payload.is_active = Boolean(body.is_active);
    } else if (body.status !== undefined) {
      payload.is_active = body.status === 'active';
    }
    if (body.meta_title !== undefined) payload.meta_title = body.meta_title.trim();
    if (body.icon !== undefined) payload.icon = String(body.icon ?? '').trim();
    if (body.show_in_nav !== undefined) payload.show_in_nav = Boolean(body.show_in_nav);
    if (body.show_in_shop_by !== undefined) payload.show_in_shop_by = Boolean(body.show_in_shop_by);
    if (body.shop_by_position !== undefined) payload.shop_by_position = Number(body.shop_by_position) || 0;
    if (body.meta_description !== undefined) payload.meta_description = body.meta_description.trim();

    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/categories/${id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );

    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update category' },
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
    const search = request.nextUrl.search;
    const endpoint = `/admin/catalog/categories/${id}/${search ? search : ''}`;

    let bodyData: any = undefined;
    try {
      bodyData = await request.json();
    } catch {
      // no json body
    }

    const res = await forwardBackendRequest(
      request,
      endpoint,
      {
        method: 'DELETE',
        ...(bodyData ? { body: JSON.stringify(bodyData) } : {}),
      }
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
      { error: error?.message || 'Failed to delete category' },
      { status: 500 }
    );
  }
}
