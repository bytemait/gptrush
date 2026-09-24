import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const cookieName = 'firstlight_admin';
const durationSeconds = 12 * 60 * 60;

function signature(payload: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters.');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function validPassword(value: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error('ADMIN_PASSWORD is not configured.');
  return timingSafeEqual(createHash('sha256').update(value).digest(), createHash('sha256').update(expected).digest());
}

export async function isAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expires, nonce, mac] = parts;
  if (!/^\d+$/.test(expires) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)) return false;
  if (Number(expires) < Date.now()) return false;
  const expected = Buffer.from(signature(`${expires}.${nonce}`), 'hex');
  return timingSafeEqual(expected, Buffer.from(mac, 'hex'));
}

export async function setAdminCookie() {
  const store = await cookies();
  const expires = String(Date.now() + durationSeconds * 1000);
  const nonce = randomBytes(16).toString('hex');
  store.set(cookieName, `${expires}.${nonce}.${signature(`${expires}.${nonce}`)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: durationSeconds,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(cookieName);
}
