import { NextResponse } from 'next/server';
import { claimTreasure } from '@/lib/treasures';

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) return NextResponse.json({ state: 'missing' }, { status: 404 });
  try {
    const result = await claimTreasure(token);
    const status = result.state === 'missing' ? 404 : 200;
    return NextResponse.json(result, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    console.error('Could not claim treasure', error);
    return NextResponse.json({ error: 'Please try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
