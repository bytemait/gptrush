import type { Metadata } from 'next';
import { getPublicTreasure } from '@/lib/treasures';
import TreasureReveal from '@/components/treasure-reveal';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function TreasurePage({params}:{params:Promise<{token:string}>}) {
  const { token } = await params;
  if (!/^[a-zA-Z0-9_-]{32}$/.test(token)) return <TreasureReveal token="" title="" missing />;
  let link: Awaited<ReturnType<typeof getPublicTreasure>>;
  try { link = await getPublicTreasure(token); }
  catch { return <TreasureReveal token="" title="" unavailable />; }
  // Never include the secret in the page HTML or metadata. Only the atomic claim response contains it.
  return <TreasureReveal token={token} title={link?.title ?? ''} missing={!link} />;
}
