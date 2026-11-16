import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest } from '../../../../../shared/api/serverHelper';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const res = await forwardBackendRequest(
      request,
      `/orders/${id}/invoice/?format=html`,
      { method: 'GET' }
    );
    const html = await res.text();
    return new NextResponse(html, {
      status: res.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load the invoice' },
      { status: 500 }
    );
  }
}
