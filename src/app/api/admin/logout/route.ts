import { NextResponse } from 'next/server';
import { clearAdminCookie } from '@/lib/auth';
import { sameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}
