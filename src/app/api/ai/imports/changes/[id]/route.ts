import { NextRequest, NextResponse } from 'next/server';
import { forwardBackendRequest, forwardJsonResponse } from '../../../../../../shared/api/serverHelper';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.text();
    const res = await forwardBackendRequest(request, `/admin/ai/imports/changes/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: body || '{}',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Failed to save the proposal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const res = await forwardBackendRequest(request, `/admin/ai/imports/changes/${id}/`, {
      method: 'DELETE',
    });
    return forwardJsonResponse(res);
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || 'Failed to delete the proposal' },
      { status: 500 }
    );
  }
}
