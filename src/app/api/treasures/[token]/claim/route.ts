import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { claimTreasure } from '@/lib/treasures';

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) return NextResponse.json({ state: 'missing' }, { status: 404 });
  try {
    const cookieName = `gptrush_winner_${token}`;
    const cookieValue = (await cookies()).get(cookieName)?.value;
    const recoveryKey = cookieValue && /^[a-zA-Z0-9_-]{43}$/.test(cookieValue) ? cookieValue : undefined;
    const result = await claimTreasure(token, recoveryKey);
    const status = result.state === 'missing' ? 404 : 200;
    const response = NextResponse.json(result, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } });
    if (result.state === 'won') {
      response.cookies.set(cookieName, result.winnerKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: `/api/treasures/${token}`,
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  } catch (error) {
    console.error('Could not claim treasure', error);
    return NextResponse.json({ error: 'Please try again.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
