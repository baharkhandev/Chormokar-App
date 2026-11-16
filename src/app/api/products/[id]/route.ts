import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest } from '../../../../shared/api/serverHelper';

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8000/api/v1';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Attempt authenticated admin endpoint
    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/products/${id}/`,
      { method: 'GET' }
    );

    if (res.ok) {
      const data = await res.json();
      // Ensure consistent envelope
      const item = data?.data || data;
      return NextResponse.json({ success: true, data: item }, { status: 200 });
    }

    // 2. Fallback to public catalog endpoint
    const fallbackRes = await fetch(`${API_URL}/catalog/products/${id}/`, {
      method: 'GET',
    });
    if (fallbackRes.ok) {
      const data = await fallbackRes.json();
      const item = data?.data || data;
      return NextResponse.json({ success: true, data: item }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Product not found' },
      { status: res.status || 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch product' },
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

    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/products/${id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    const item = data?.data || data;
    return NextResponse.json({ success: res.ok, data: item }, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const res = await forwardBackendRequest(
      request,
      `/admin/catalog/products/${id}/`,
      {
        method: 'DELETE',
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
      { error: error?.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
