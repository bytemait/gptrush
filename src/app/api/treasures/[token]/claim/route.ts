import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { claimTreasure } from '@/lib/treasures';

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) return NextResponse.json({ state: 'missing' }, { status: 404 });
  try {
    const winnerCookie = `gptrush_winner_${token}`;
    const visitorCookie = `gptrush_visitor_${token}`;
    const cookieJar = await cookies();
    const winnerValue = cookieJar.get(winnerCookie)?.value;
    const recoveryKey = winnerValue && /^[a-zA-Z0-9_-]{43}$/.test(winnerValue) ? winnerValue : undefined;
    const visitorValue = cookieJar.get(visitorCookie)?.value;
    const visitKey = visitorValue && /^[a-zA-Z0-9_-]{43}$/.test(visitorValue)
      ? visitorValue
      : randomBytes(32).toString('base64url');
    const result = await claimTreasure(token, recoveryKey, visitKey);
    const status = result.state === 'missing' ? 404 : 200;
    // A loser credential is only needed by the browser cookie; never echo it into JS.
    let issuedVisitKey: string | undefined;
    let publicResult: Record<string, unknown> = result;
    if (result.state === 'claimed' && 'visitKey' in result) {
      issuedVisitKey = result.visitKey;
      const { visitKey: _visitKey, stored: _stored, ...safeResult } = result;
      publicResult = safeResult;
    } else if (result.state === 'claimed') {
      const { stored: _stored, ...safeResult } = result;
      publicResult = safeResult;
    }
    const response = NextResponse.json(publicResult, { status, headers: { 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' } });
    if (result.state === 'won') {
      response.cookies.set(winnerCookie, result.winnerKey, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: `/api/treasures/${token}`,
        maxAge: 60 * 60 * 24 * 30,
      });
    } else if (result.state === 'claimed' && issuedVisitKey) {
      response.cookies.set(visitorCookie, issuedVisitKey, {
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
