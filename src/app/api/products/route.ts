import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../shared/api/serverHelper';

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8001/api/v1';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.toString();
    const adminEndpoint = `/admin/catalog/products/${query ? `?${query}` : ''}`;

    // 1. Attempt authenticated admin endpoint
    const res = await forwardBackendRequest(request, adminEndpoint, {
      method: 'GET',
    });

    if (res.ok) {
      return forwardJsonResponse(res);
    }

    // 2. Fallback to public catalog endpoint if unauthorized or token expired
    const publicUrl = `${API_URL}/catalog/products/${query ? `?${query}` : ''}`;
    const fallbackRes = await fetch(publicUrl, { method: 'GET' });
    if (fallbackRes.ok) {
      const fallbackData = await fallbackRes.json();
      return NextResponse.json(fallbackData, { status: 200 });
    }

    // If both failed, forward the original response or error
    const errData = await res.json().catch(() => ({}));
    return NextResponse.json(errData, { status: res.status });
  } catch (error: any) {
    console.error('Error in /api/products route:', error);
    // Try direct public fetch as last-resort fallback
    try {
      const searchParams = request.nextUrl.searchParams;
      const query = searchParams.toString();
      const fallbackRes = await fetch(
        `${API_URL}/catalog/products/${query ? `?${query}` : ''}`
      );
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        return NextResponse.json(data, { status: 200 });
      }
    } catch {}

    return NextResponse.json(
      { error: error?.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const res = await forwardBackendRequest(
      request,
      '/admin/catalog/products/',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    return forwardJsonResponse(res);
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}
