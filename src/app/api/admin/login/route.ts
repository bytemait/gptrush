import { NextResponse } from 'next/server';
import { setAdminCookie, validPassword } from '@/lib/auth';
import { sameOrigin } from '@/lib/security';

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    const body = await request.json();
    if (typeof body.password !== 'string' || !validPassword(body.password)) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    await setAdminCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Admin login failed', error);
    return NextResponse.json({ error: 'Unable to sign in. Check your server configuration.' }, { status: 500 });
  }
}
