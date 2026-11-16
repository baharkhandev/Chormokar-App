import { NextResponse } from 'next/server';

/**
 * Server-side proxy that asks the storefront to revalidate its cached pages.
 * Keeps the shared secret out of the browser bundle.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const storefront = (process.env.NEXT_PUBLIC_STOREFRONT_URL || 'http://localhost:3001').replace(
    /\/$/,
    ''
  );

  if (!secret) {
    return NextResponse.json({ error: 'Revalidation is not configured' }, { status: 500 });
  }

  try {
    const body = await request.text();
    const res = await fetch(`${storefront}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-revalidate-secret': secret },
      body: body || JSON.stringify({ path: '/' }),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to reach the storefront' },
      { status: 502 }
    );
  }
}
