import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.toString();
    const endpoint = `/admin/catalog/categories/${query ? `?${query}` : ''}`;

    const res = await forwardBackendRequest(request, endpoint, {
      method: 'GET',
    });

    return forwardJsonResponse(res);
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const payload: Record<string, any> = {
      name: body.name?.trim(),
      slug: body.slug?.trim(),
      parent: body.parent ? body.parent : null,
      position: body.position !== undefined ? Number(body.position) || 0 : 0,
      is_active:
        body.is_active !== undefined
          ? Boolean(body.is_active)
          : body.status !== undefined
          ? body.status === 'active'
          : true,
      meta_title: body.meta_title?.trim() || '',
      meta_description: body.meta_description?.trim() || '',
      icon: typeof body.icon === 'string' ? body.icon.trim() : '',
      show_in_nav: body.show_in_nav !== undefined ? Boolean(body.show_in_nav) : true,
      show_in_shop_by:
        body.show_in_shop_by !== undefined ? Boolean(body.show_in_shop_by) : false,
      shop_by_position:
        body.shop_by_position !== undefined ? Number(body.shop_by_position) || 0 : 0,
    };

    if (!payload.name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    if (!payload.slug) {
      payload.slug = payload.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    const res = await forwardBackendRequest(
      request,
      '/admin/catalog/categories/',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );

    return forwardJsonResponse(res);
  } catch (error: any) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create category' },
      { status: 500 }
    );
  }
}
