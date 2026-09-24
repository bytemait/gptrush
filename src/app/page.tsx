import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { listTreasures } from '@/lib/treasures';
import Dashboard from '@/components/dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (!await isAdmin()) redirect('/login');
  let initial = null;
  try { initial = await listTreasures(); } catch { /* Show recoverable error in the dashboard. */ }
  return <Dashboard initial={initial} />;
}
