'use client';

import { useEffect, useRef, useState } from 'react';

type Result = { state: 'won'; title: string; treasure: string } | { state: 'claimed' | 'missing' };

export default function TreasureReveal({token,title,missing=false,unavailable=false}:{token:string;title:string;missing?:boolean;unavailable?:boolean}) {
  const [result,setResult] = useState<Result | null>(missing ? {state:'missing'} : null);
  const [error,setError] = useState(unavailable ? 'The service is temporarily unavailable. Please try again later.' : '');
  const started = useRef(false);
  useEffect(()=>{
    if (!token || started.current) return;
    started.current=true;
    // A direct POST claims immediately upon opening; there is no signup, name, or extra click.
    // Never retry automatically: a lost winning response cannot be safely replayed.
    void fetch(`/api/treasures/${token}/claim`,{method:'POST',cache:'no-store'})
      .then(async response=>{const data=await response.json();if(!response.ok && data.state!=='missing')throw new Error('Could not check this link. Please contact the host.');setResult(data);})
      .catch(()=>setError('Could not check this link. Please contact the host.'));
  },[token]);
  return <main className="flex min-h-screen items-center justify-center bg-[#f7f7f2] px-5 py-10 text-[#262b23]"><div className="w-full max-w-[420px]"><div className="mb-7 flex items-center justify-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#c3ef77] text-lg">✳</span><span className="text-lg font-bold tracking-tight">firstlight<span className="text-[#c8d8ad]">.</span></span></div><div className="overflow-hidden rounded-[24px] border border-[#e7e7df] bg-white text-center shadow-[0_15px_60px_rgba(42,47,35,0.06)]"><div className="bg-[#f2f6e9] px-6 py-8"><span className="mx-auto grid h-20 w-20 place-items-center rounded-[25px] bg-white text-4xl shadow-sm">{result?.state==='won'?'🎉':result?.state==='claimed'?'🌱':result?.state==='missing'?'🔎':'🎁'}</span><p className="mt-5 text-[10px] font-bold uppercase tracking-[1.7px] text-[#828675]">{title || 'Treasure link'}</p><h1 className="mt-2 text-[27px] font-semibold tracking-[-1px]">{result?.state==='won'?'You found it!':result?.state==='claimed'?'Better luck next time.':result?.state==='missing'?'Link not found.':error?'Something went wrong.':'One little moment…'}</h1></div><div className="px-7 py-8">{result?.state==='won'?<><p className="text-xs text-[#77796e]">You were the first to open this link. Here’s your treasure:</p><div className="mt-5 whitespace-pre-wrap break-words rounded-2xl border border-[#e4ecd7] bg-[#f6f9f0] px-5 py-6 text-left text-[15px] font-semibold leading-7 text-[#344427]">{result.treasure}</div><p className="mt-5 text-[11px] leading-5 text-[#929488]">Save this now. For your privacy, it won’t be displayed again when the page is reopened.</p></>:result?.state==='claimed'?<p className="text-xs leading-6 text-[#77796e]">Someone else got here first. This link has already been claimed, but there may be more treasures out there.</p>:result?.state==='missing'?<p className="text-xs leading-6 text-[#77796e]">This treasure link doesn’t exist. Check the link and try again.</p>:error?<p role="alert" className="text-xs leading-6 text-[#ae503a]">{error}</p>:<p className="animate-pulse text-xs text-[#77796e]">Checking who made it here first…</p>}</div></div><p className="mt-6 text-center text-[10px] text-[#a0a195]">One link. One winner. That’s the magic.</p></div></main>;
}
