import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest } from '../../../../shared/api/serverHelper';

export async function GET(request: NextRequest) {
  try {
    const res = await forwardBackendRequest(request, '/admin/newsletter/export/', {
      method: 'GET',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Could not export subscribers.' },
        { status: res.status }
      );
    }

    const csv = await res.text();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="newsletter-subscribers.csv"',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Could not export subscribers.' },
      { status: 500 }
    );
  }
}
