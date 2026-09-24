'use client';

import { useEffect, useRef, useState } from 'react';

type Result = { state: 'won'; title: string; treasure: string; winnerKey: string } | { state: 'claimed' | 'missing' };

// Deliberate, fixed pixel field: SVG shapes and Tailwind utilities, no custom CSS or image assets.
const pixels = Array.from({ length: 30 * 24 }, (_, i) => {
  const x = i % 30;
  const y = Math.floor(i / 30);
  const radius = Math.hypot((x - 15) / 15, (y - 12) / 12);
  const noise = ((x * 41 + y * 67 + x * y * 13) % 17) / 17;
  return { x, y, radius, noise };
}).filter(({ radius, noise }) => radius < 1.12 && noise > radius * .48);

function PixelField({ active }: { active: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 480 384" className={`pointer-events-none absolute inset-0 h-full w-full ${active ? 'text-[#b9ff52]' : 'text-[#6eac30]'}`} preserveAspectRatio="xMidYMid meet">
    {pixels.map(({ x, y, radius, noise }) => <rect key={`${x}-${y}`} x={x * 16 + 3} y={y * 16 + 3} width={radius < .35 && noise > .6 ? 9 : 4} height={radius < .35 && noise > .6 ? 9 : 4} fill="currentColor" opacity={Math.max(.12, (1.12 - radius) * .48)} />)}
    <path d="M240 90v22m0 160v22M114 192h22m208 0h22M155 107l16 16m138 138 16 16M325 107l-16 16M171 261l-16 16" fill="none" stroke="currentColor" strokeWidth="2" opacity=".45" />
    <path d="M240 119l73 73-73 73-73-73z" fill="#0a0e09" stroke="currentColor" strokeWidth="3" />
    <path d="M240 139l53 53-53 53-53-53z" fill="currentColor" opacity=".12" />
    <path d="M240 161v62m-31-31h62" stroke="currentColor" strokeWidth="5" strokeLinecap="square" />
    <path d="M240 146v10m0 72v10m-46-46h10m72 0h10" stroke="currentColor" strokeWidth="3" />
  </svg>;
}

export default function TreasureReveal({ token, title, missing = false, unavailable = false }: { token: string; title: string; missing?: boolean; unavailable?: boolean }) {
  const [result, setResult] = useState<Result | null>(missing ? { state: 'missing' } : null);
  const [error, setError] = useState(unavailable ? 'The service is temporarily unavailable.' : '');
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    // Exactly one claim attempt. Never retry automatically: a lost winning response cannot be replayed.
    void fetch(`/api/treasures/${token}/claim`, { method: 'POST', cache: 'no-store' })
      .then(async response => {
        const data = await response.json();
        if (!response.ok && data.state !== 'missing') throw new Error('claim failed');
        setResult(data);
      })
      .catch(() => setError('Could not check this link. Please contact the host.'));
  }, [token]);

  async function copyTreasure() {
    if (result?.state !== 'won') return;
    try {
      await navigator.clipboard.writeText(result.treasure);
      setCopied(true);
      setCopyError('');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopyError('Copy is unavailable here. Select and copy the treasure text above.');
    }
  }

  async function submitName(e: React.FormEvent) {
    e.preventDefault();
    if (result?.state !== 'won') return;
    setSubmitting(true); setNameError('');
    try {
      const response = await fetch(`/api/treasures/${token}/winner`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: result.winnerKey, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your name.');
      setSavedName(data.name);
    } catch (err) { setNameError(err instanceof Error ? err.message : 'Could not save your name.'); }
    finally { setSubmitting(false); }
  }

  const won = result?.state === 'won';
  const stateLabel = won ? '01 / ACCESS GRANTED' : result?.state === 'claimed' ? '02 / CLAIMED' : result?.state === 'missing' ? '04 / NOT FOUND' : error ? '03 / CONNECTION LOST' : '00 / CONNECTING';
  const heading = won ? <>IT&apos;S<br /><span className="text-[#b9ff52]">YOURS.</span></> : result?.state === 'claimed' ? <>TOO<br /><span className="text-[#b9ff52]">LATE.</span></> : result?.state === 'missing' ? <>NOT<br /><span className="text-[#b9ff52]">FOUND.</span></> : error ? <>SIGNAL<br /><span className="text-[#b9ff52]">LOST.</span></> : <>HOLD<br /><span className="text-[#b9ff52]">TIGHT.</span></>;

  return <main className="min-h-dvh overflow-hidden bg-[#090d09] font-mono text-[#f2f7e9] selection:bg-[#b9ff52] selection:text-black">
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col px-5 sm:px-10 lg:px-16">
      <header className="flex items-center justify-between border-b border-[#334328] py-5 sm:py-7">
        <div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-8 w-8 place-items-center border border-[#b9ff52] text-[10px] font-black tracking-tight text-[#b9ff52]">FL</span><span className="text-base font-black tracking-[-.06em] sm:text-xl">FIRSTLIGHT<span className="text-[#b9ff52]">_</span></span></div>
        <span className="text-[10px] font-bold tracking-[.14em] text-[#9ab17f] sm:text-xs">ONE LINK <span className="mx-1 text-[#b9ff52]">/</span> ONE WINNER</span>
      </header>

      <div className="grid flex-1 items-center gap-6 py-9 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.85fr)] lg:py-12">
        <section className="relative z-10">
          <div className="mb-8 flex items-center gap-3 text-[11px] font-bold tracking-[.2em] text-[#b9ff52] sm:text-xs"><span className="h-2.5 w-2.5 bg-[#b9ff52] shadow-[0_0_16px_#b9ff52]" />{stateLabel}</div>
          <h1 aria-live="polite" className="text-[clamp(4.2rem,16vw,10rem)] font-black leading-[.84] tracking-[-.105em] sm:text-[clamp(6rem,11vw,10rem)]">{heading}</h1>
          <div className="mt-8 border-l-2 border-[#b9ff52] pl-4 sm:mt-10 sm:pl-6">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9ab17f]">{title || 'TREASURE LINK'}</p>
            <p className="mt-3 max-w-lg text-lg font-bold leading-snug sm:text-xl lg:text-2xl">{won ? 'You got here first. This moment is yours.' : result?.state === 'claimed' ? 'Someone else found this one first. Keep looking.' : result?.state === 'missing' ? 'This link does not exist. Double-check it and try again.' : error ? error : 'Checking the signal. This will only take a second.'}</p>
          </div>
        </section>
        <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px] overflow-hidden border border-[#263621] bg-[#0a0e09] lg:max-w-none"><PixelField active={won} /><div className="pointer-events-none absolute left-4 top-4 font-mono text-[10px] tracking-widest text-[#8bb366]">FIG. 01 — FIRST IN</div><div className="pointer-events-none absolute bottom-4 right-4 font-mono text-[10px] tracking-widest text-[#8bb366]">FL / 001</div></div>
      </div>

      {won && <section className="relative z-10 mb-8 grid gap-0 border border-[#b9ff52] lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)]">
        <div className="min-w-0 border-b border-[#415d29] p-5 sm:p-8 lg:border-b-0 lg:border-r"><p className="text-[11px] font-bold tracking-[.2em] text-[#b9ff52]">YOUR TREASURE / REVEALED</p><div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 whitespace-pre-wrap break-words text-2xl font-black leading-tight tracking-tight sm:text-4xl">{result.treasure}</div><button type="button" onClick={copyTreasure} className="min-h-12 shrink-0 border border-[#b9ff52] px-4 text-xs font-black text-[#b9ff52] transition hover:bg-[#b9ff52] hover:text-[#0a0e09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9ff52]">{copied ? 'COPIED' : 'COPY TREASURE'}</button></div>{copyError && <p role="alert" className="mt-3 text-xs text-[#ff9885]">{copyError}</p>}<p className="mt-7 text-sm leading-6 text-[#b4c6a2]">Save this screen now. The treasure will not appear again if you reload.</p></div>
        <div className="min-w-0 p-5 sm:p-8"><p className="text-[11px] font-bold tracking-[.2em] text-[#b9ff52]">MAKE IT OFFICIAL / OPTIONAL</p><h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">PUT YOUR NAME<br />ON THE BOARD.</h2>{savedName ? <p role="status" className="mt-8 border border-[#b9ff52] bg-[#b9ff52]/10 p-4 text-lg font-bold text-[#b9ff52]">SAVED: {savedName}</p> : <form onSubmit={submitName} className="mt-6"><label htmlFor="winner-name" className="block text-xs font-bold uppercase tracking-[.15em] text-[#b4c6a2]">Your name</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="winner-name" type="text" autoComplete="name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="ENTER YOUR NAME" className="min-h-14 min-w-0 flex-1 rounded-none border border-[#53743c] bg-[#0f170d] px-4 text-base font-bold text-white outline-none placeholder:text-[#718567] focus:border-[#b9ff52]" /><button type="submit" disabled={submitting} className="min-h-14 shrink-0 bg-[#b9ff52] px-6 text-sm font-black text-[#0a0e09] transition hover:bg-[#d3ff8c] disabled:opacity-60">{submitting ? 'SAVING...' : 'SUBMIT NAME →'}</button></div>{nameError && <p role="alert" className="mt-3 text-sm text-[#ff9885]">{nameError}</p>}<p className="mt-4 text-xs leading-5 text-[#a5b797]">Only your name is shared with the event admin. You can skip this.</p></form>}</div>
      </section>}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[#334328] py-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#9ab17f] sm:text-xs"><span>FIRSTLIGHT / FIND YOUR MOMENT</span><span>BUILT FOR THE FIRST TO ARRIVE</span></footer>
    </div>
  </main>;
}
