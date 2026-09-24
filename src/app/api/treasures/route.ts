import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { createTreasure, listTreasures } from '@/lib/treasures';
import { sameOrigin } from '@/lib/security';

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try { return NextResponse.json(await listTreasures(), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { console.error('Could not list treasures', error); return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  if (typeof body.title !== 'string' || typeof body.treasure !== 'string' || !body.title.trim() || !body.treasure.trim() || body.title.length > 100 || body.treasure.length > 2000) {
    return NextResponse.json({ error: 'Enter a title (up to 100 characters) and treasure (up to 2,000 characters).' }, { status: 400 });
  }
  try { return NextResponse.json(await createTreasure(body.title.trim(), body.treasure.trim()), { status: 201 }); }
  catch (error) { console.error('Could not create treasure link', error); return NextResponse.json({ error: 'Database unavailable.' }, { status: 503 }); }
}
