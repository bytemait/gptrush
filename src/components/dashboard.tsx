'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import type { TreasureSummary } from '@/lib/treasures';

const QRDownloadDialog = dynamic(() => import('./qr-download'), { ssr: false });

type Props = { initial: TreasureSummary[] | null };
export default function Dashboard({ initial }: Props) {
  const [items, setItems] = useState(initial ?? []);
  const [title, setTitle] = useState('');
  const [treasure, setTreasure] = useState('');
  const [error, setError] = useState(initial ? '' : 'Could not load links. Check your database connection.');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [origin, setOrigin] = useState('');
  const [qrTarget, setQrTarget] = useState<TreasureSummary | null>(null);
  useEffect(() => {
    setOrigin(window.location.origin);
    let alive = true;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch('/api/treasures', { cache: 'no-store' });
        if (!response.ok) return;
        const links: TreasureSummary[] = await response.json();
        if (alive) setItems(links);
      } catch { /* Keep the last known list until connectivity returns. */ }
    };
    const timer = window.setInterval(() => void refresh(), 3000);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await fetch('/api/treasures', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, treasure }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create link.');
      setItems(current => [data, ...current]); setTitle(''); setTreasure('');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not create link.'); }
    finally { setBusy(false); }
  }
  async function copy(token: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/t/${token}`); setCopied(token); setTimeout(() => setCopied(''), 2200); }
    catch { setError('Copy failed. Open the link and copy it from your address bar.'); }
  }
  async function logout() { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/login'; }
  return <main className="min-h-screen bg-[#f7f7f2] text-[#262b23]"><div className="mx-auto max-w-6xl px-5 pb-16 sm:px-10">
    <header className="flex h-20 items-center justify-between border-b border-[#e6e6dd]"><div className="flex items-center gap-2.5"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#c3ef77] text-lg font-black">+</span><span className="text-[19px] font-bold tracking-tight">gptrush<span className="text-[#c8d8ad]">.</span></span></div><div className="flex items-center gap-4"><span className="hidden text-xs text-[#888b7f] sm:inline">Admin dashboard</span><button onClick={logout} className="text-xs font-semibold text-[#73786b] hover:text-black">Sign out ↗</button></div></header>
    <section className="pt-12"><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#899180]">One link. One lucky person.</p><h1 className="mt-3 text-4xl font-semibold tracking-[-1.8px] sm:text-[46px]">Make a treasure link<span className="text-[#9ba790]">.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#77796e]">Create a unique link for each treasure. The first person to open it gets the reveal. Everyone after sees that it’s already been claimed.</p></section>
    <div className="mt-9 grid gap-5 lg:grid-cols-[.95fr_1.3fr]"><section className="h-fit rounded-[20px] border border-[#e7e7df] bg-white p-6 sm:p-7"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1f7e9] text-xl font-black">+</span><div><h2 className="text-sm font-semibold">New treasure</h2><p className="mt-0.5 text-[11px] text-[#929488]">Create something worth finding.</p></div></div><form onSubmit={create} className="mt-7"><label htmlFor="title" className="text-[11px] font-semibold">Link label</label><input id="title" required maxLength={100} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Golden ticket #1" className="mt-2 h-11 w-full rounded-xl border border-[#e7e7df] bg-[#fdfdfb] px-3 text-xs outline-none placeholder:text-[#b2b3aa] focus:border-[#a6ca72]"/><p className="mt-1 text-[10px] text-[#a0a195]">This label is visible to visitors.</p><label htmlFor="treasure" className="mt-6 block text-[11px] font-semibold">The treasure <span className="font-normal text-[#a0a195]">· only the winner will see this</span></label><textarea id="treasure" required maxLength={2000} rows={5} value={treasure} onChange={e=>setTreasure(e.target.value)} placeholder="Your secret prize, code, instructions, or message…" className="mt-2 w-full resize-none rounded-xl border border-[#e7e7df] bg-[#fdfdfb] px-3 py-3 text-xs leading-5 outline-none placeholder:text-[#b2b3aa] focus:border-[#a6ca72]"/>{error&&<p role="alert" className="mt-3 rounded-xl bg-[#fff0ed] p-3 text-[11px] text-[#ae503a]">{error}</p>}<button disabled={busy} className="mt-5 h-11 w-full rounded-xl bg-[#c5ef7c] text-xs font-bold text-[#35451f] hover:bg-[#b8e76a] disabled:opacity-60">{busy?'Creating…':'Generate unique link →'}</button></form></section>
    <section className="rounded-[20px] border border-[#e7e7df] bg-white"><div className="flex items-center justify-between border-b border-[#efefe9] px-6 py-5"><div><h2 className="text-sm font-semibold">Your links</h2><p className="mt-1 text-[11px] text-[#929488]">Share a link or put it in a QR code.</p></div><span className="rounded-full bg-[#f1f5eb] px-3 py-1 text-[10px] font-semibold text-[#718059]">{items.length} total</span></div>{items.length?<div className="divide-y divide-[#efefe9]">{items.map(item=><div key={item.token} className="px-6 py-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold">{item.title}</p><p className="mt-1 text-[10px] text-[#a0a195]">Created {new Date(item.created_at).toLocaleString()}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.claimed_at?'bg-[#eeede7] text-[#848579]':'bg-[#e9f5d8] text-[#527b2a]'}`}>{item.claimed_at?'Claimed':'● Available'}</span></div>{item.claimed_at && <p className="mt-3 text-[11px] font-semibold text-[#566a43]">Winner: {item.winner_name || 'Waiting for winner to enter their name'}</p>}<div className="mt-4 flex items-center gap-2"><span className="min-w-0 flex-1 truncate rounded-lg bg-[#f7f8f4] px-3 py-2.5 font-mono text-[10px] text-[#6a6e63]">{origin ? `${origin}/t/${item.token}` : `/t/${item.token}`}</span><div className="flex shrink-0 gap-2"><button onClick={()=>copy(item.token)} className="rounded-lg border border-[#e7e7df] px-3 py-2.5 text-[10px] font-semibold hover:bg-[#f7f8f4]">{copied===item.token?'Copied!':'Copy link'}</button><button onClick={()=>setQrTarget(item)} className="rounded-lg border border-[#e7e7df] px-3 py-2.5 text-[10px] font-semibold hover:bg-[#f7f8f4]">QR code</button></div></div><p className="mt-2 text-[9px] text-[#9a9c91]">Opening this link claims it. Don’t open it yourself before sharing.</p></div>)}</div>:<div className="px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#f3f6ed] text-2xl font-black">+</div><p className="mt-4 text-sm font-semibold">Nothing hidden yet.</p><p className="mt-2 text-[11px] text-[#929488]">Create a treasure and your first link will appear here.</p></div>}</section></div><p className="mt-10 text-center text-[10px] text-[#a0a195]">The first successful request wins. Each link can be claimed exactly once.</p>
    {qrTarget && origin && <QRDownloadDialog value={`${origin}/t/${qrTarget.token}`} title={qrTarget.title} onClose={() => setQrTarget(null)} />}
  </div></main>;
}
