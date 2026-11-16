import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.toString();
    const endpoint = `/admin/promotions/popups/${query ? `?${query}` : ''}`;

    const res = await forwardBackendRequest(request, endpoint, { method: 'GET' });

    return forwardJsonResponse(res);
  } catch (error: any) {
    console.error('Error fetching promo popups:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch promo popups' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const options: RequestInit = { method: 'POST' };

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      options.body = formData;
    } else {
      const body = await request.json();
      options.body = JSON.stringify(body);
    }

    const res = await forwardBackendRequest(request, '/admin/promotions/popups/', options);

    return forwardJsonResponse(res);
  } catch (error: any) {
    console.error('Error creating promo popup:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create promo popup' },
      { status: 500 }
    );
  }
}
