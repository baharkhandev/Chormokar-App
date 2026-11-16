import { NextResponse } from 'next/server';

const API_URL = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8001/api/v1'
).replace(/\/$/, '');

async function get(path: string) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) return { data: [], meta: {} };
    return res.json();
  } catch {
    return { data: [], meta: {} };
  }
}

export async function GET() {
  const [best, flash] = await Promise.all([
    get('/catalog/best-sellers/?limit=12'),
    get('/catalog/flash-deals/?limit=12'),
  ]);
  return NextResponse.json({ bestSellers: best, flashDeals: flash });
}
