'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [password,setPassword] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to sign in.');
      router.push('/'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 text-[#262b23]"><div className="w-full max-w-sm"><div className="mb-8 flex items-center justify-center gap-2.5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#c3ef77] text-[10px] font-black tracking-tight">GP</span><span className="text-xl font-bold tracking-tight">gptrush<span className="text-[#c8d8ad]">.</span></span></div><form onSubmit={submit} className="rounded-[22px] border border-[#e7e7df] bg-white p-7 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[2px] text-[#899180]">Admin access</p><h1 className="mt-3 text-2xl font-semibold tracking-tight">Welcome back.</h1><p className="mt-2 text-xs leading-5 text-[#85877a]">Sign in to create and manage treasure links.</p><label htmlFor="password" className="mt-7 block text-xs font-semibold">Password</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter admin password" className="mt-2 h-12 w-full rounded-xl border border-[#e7e7df] px-4 text-sm outline-none focus:border-[#a6ca72]"/>{error&&<p role="alert" className="mt-3 text-xs text-[#ae503a]">{error}</p>}<button disabled={busy} className="mt-5 w-full rounded-xl bg-[#c5ef7c] py-3.5 text-xs font-bold text-[#35451f] disabled:opacity-60">{busy?'Signing in…':'Sign in →'}</button></form></div></main>;
}
