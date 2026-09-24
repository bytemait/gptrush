import { NextResponse } from 'next/server';
import { saveWinnerName } from '@/lib/treasures';
import { sameOrigin } from '@/lib/security';

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { token } = await params;
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) return NextResponse.json({ error: 'Invalid link.' }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.key !== 'string' || !/^[a-zA-Z0-9_-]{43}$/.test(body.key)) return NextResponse.json({ error: 'Only the winner can enter a name.' }, { status: 403 });
  if (typeof body.name !== 'string') return NextResponse.json({ error: 'Enter your name.' }, { status: 400 });
  const name = body.name.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) return NextResponse.json({ error: 'Enter a name of up to 60 characters.' }, { status: 400 });
  try {
    const state = await saveWinnerName(token, body.key, name);
    if (state === 'unauthorized') return NextResponse.json({ error: 'Only the winner can enter a name.' }, { status: 403 });
    if (state === 'already-set') return NextResponse.json({ error: 'A winner name was already submitted for this link.' }, { status: 409 });
    return NextResponse.json({ state: 'saved', name }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not save winner name', error);
    return NextResponse.json({ error: 'Could not save your name. Please try again.' }, { status: 503 });
  }
}
