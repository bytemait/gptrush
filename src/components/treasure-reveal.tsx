'use client';

import { useEffect, useRef, useState } from 'react';
import CreditHowTo from './credit-how-to';

type Result = { state: 'won'; title: string; treasure: string; winnerKey: string } | { state: 'claimed'; gapMs: number; rank: number; message: string | null; tier: string | null } | { state: 'missing' };
type Theme = 'waiting' | 'won' | 'claimed';

const themes = {
  waiting: {
    accent: 'text-[#b9ff52]', muted: 'text-[#9ab17f]', soft: 'text-[#b4c6a2]',
    border: 'border-[#334328]', accentBorder: 'border-[#b9ff52]', divider: 'border-[#415d29]',
    dot: 'bg-[#b9ff52] shadow-[0_0_16px_#b9ff52]',
    surface: 'border-[#263621] bg-[#0a0e09]', input: 'border-[#53743c] bg-[#0f170d] placeholder:text-[#718567] focus:border-[#b9ff52]',
    button: 'bg-[#b9ff52] text-[#0a0e09] hover:bg-[#d3ff8c]', outline: 'border-[#b9ff52] text-[#b9ff52] hover:bg-[#b9ff52]',
    saved: 'border-[#b9ff52] bg-[#b9ff52]/10 text-[#b9ff52]', glow: 'text-[#b9ff52]',
  },
  won: {
    accent: 'text-[#6acbff]', muted: 'text-[#90b7d0]', soft: 'text-[#b7d4e6]',
    border: 'border-[#29445a]', accentBorder: 'border-[#6acbff]', divider: 'border-[#365c78]',
    dot: 'bg-[#6acbff] shadow-[0_0_16px_#6acbff]',
    surface: 'border-[#29445a] bg-[#09121c]', input: 'border-[#417499] bg-[#0d1925] placeholder:text-[#89abc2] focus:border-[#6acbff]',
    button: 'bg-[#6acbff] text-[#08131d] hover:bg-[#a3e0ff]', outline: 'border-[#6acbff] text-[#6acbff] hover:bg-[#6acbff]',
    saved: 'border-[#6acbff] bg-[#6acbff]/10 text-[#6acbff]', glow: 'text-[#6acbff]',
  },
  claimed: {
    accent: 'text-[#ffe05a]', muted: 'text-[#c7b477]', soft: 'text-[#e0d2a5]',
    border: 'border-[#51462c]', accentBorder: 'border-[#ffe05a]', divider: 'border-[#6d5c30]',
    dot: 'bg-[#ffe05a] shadow-[0_0_16px_#ffe05a]',
    surface: 'border-[#51462c] bg-[#17140a]', input: 'border-[#7a6938] bg-[#211c0f] placeholder:text-[#b1a277] focus:border-[#ffe05a]',
    button: 'bg-[#ffe05a] text-[#17140a] hover:bg-[#ffeb97]', outline: 'border-[#ffe05a] text-[#ffe05a] hover:bg-[#ffe05a]',
    saved: 'border-[#ffe05a] bg-[#ffe05a]/10 text-[#ffe05a]', glow: 'text-[#ffe05a]',
  },
} as const;

function formatGap(milliseconds: number) {
  const preciseMs = Math.max(0, milliseconds);
  if (preciseMs < 1000) return `${preciseMs.toFixed(3)} milliseconds`;
  if (preciseMs < 60_000) return `${(preciseMs / 1000).toFixed(2)} seconds`;
  const minutes = Math.floor(preciseMs / 60_000);
  const seconds = ((preciseMs % 60_000) / 1000).toFixed(2);
  return `${minutes} min ${seconds} sec`;
}

function CreditArtifact({ theme }: { theme: Theme }) {
  const palette = theme === 'won'
    ? { accent: '#6acbff', muted: '#397fa5', text: '#b7eaff' }
    : theme === 'claimed'
      ? { accent: '#ffe05a', muted: '#9a7b28', text: '#fff0ad' }
      : { accent: '#b9ff52', muted: '#587c35', text: '#dcffb5' };
  const visual = theme === 'won'
    ? { border: 'border-[#29445a]', grid: '[background-image:linear-gradient(to_right,#6acbff10_1px,transparent_1px),linear-gradient(to_bottom,#6acbff10_1px,transparent_1px)]', motion: 'animate-pulse', face: 'bg-[#0b1420]' }
    : theme === 'claimed'
      ? { border: 'border-[#51462c]', grid: '[background-image:linear-gradient(to_right,#ffe05a10_1px,transparent_1px),linear-gradient(to_bottom,#ffe05a10_1px,transparent_1px)]', motion: '', face: 'bg-[#19150b]' }
      : { border: 'border-[#263621]', grid: '[background-image:linear-gradient(to_right,#b9ff5210_1px,transparent_1px),linear-gradient(to_bottom,#b9ff5210_1px,transparent_1px)]', motion: 'animate-pulse', face: 'bg-[#0d150b]' };
  const pixels = Array.from({ length: 196 }, (_, i) => {
    const x = i % 14;
    const y = Math.floor(i / 14);
    const edge = Math.min(x, y, 13 - x, 13 - y);
    const on = ((x * 7 + y * 11 + x * y * 3) % 13) < 7 - Math.min(edge, 3);
    return on ? { x, y } : null;
  }).filter((pixel): pixel is { x: number; y: number } => pixel !== null);

  return <div aria-hidden="true" className={`relative mx-auto flex aspect-[5/4] w-full max-w-[520px] items-center justify-center overflow-hidden border bg-[#0a0e09] transition-colors duration-700 ${visual.border}`}>
    <div className={`absolute inset-0 opacity-60 ${visual.grid} [background-size:20px_20px]`} />
    <div className="absolute left-4 top-4 text-[10px] tracking-widest" style={{ color: palette.text }}>OPENAI CREDITS / 01</div>
    <div className="absolute bottom-4 right-4 text-[10px] tracking-widest" style={{ color: palette.text }}>GP / REWARD</div>
    <div className={`credit-artifact relative flex h-[72%] w-[72%] items-center justify-center ${visual.motion} motion-reduce:animate-none ${theme === 'claimed' ? 'opacity-65' : ''}`} style={{ color: palette.accent }}>
      <div className="absolute inset-[8%] rotate-45 border-2 border-current opacity-60" />
      <div className="absolute inset-[17%] rotate-45 border border-current opacity-35" />
      <div className={`relative flex aspect-[1.45/1] w-[72%] items-center justify-center overflow-hidden border-2 border-current ${visual.face} shadow-[0_0_48px_color-mix(in_srgb,currentColor_18%,transparent)]`}>
        <div className="absolute inset-2 border border-current opacity-30" />
        <svg viewBox="0 0 112 80" className="relative h-[62%] w-[62%]" shapeRendering="crispEdges">
          {pixels.map(({ x, y }) => <rect key={`${x}-${y}`} x={x * 8} y={y * 8} width="7" height="7" fill={x < 2 || y < 2 || x > 11 || y > 11 ? palette.muted : palette.accent} opacity={((x * 5 + y * 3) % 5 + 4) / 8} />)}
        </svg>
        <span className="absolute bottom-2 right-3 text-[8px] font-bold tracking-[.18em]" style={{ color: palette.text }}>CREDITS</span>
      </div>
      {theme === 'won' && <><span className="absolute left-[12%] top-[20%] h-2 w-2 animate-ping bg-current" /><span className="absolute bottom-[18%] right-[14%] h-2 w-2 animate-pulse bg-current" /><span className="absolute right-[15%] top-[16%] h-1.5 w-1.5 animate-ping bg-current [animation-delay:400ms]" /></>}
      {theme === 'claimed' && <div className="absolute bottom-[6%] rounded-sm border border-current bg-[#17140a] px-3 py-1 text-[9px] font-bold tracking-[.18em]">ALREADY CLAIMED</div>}
    </div>
  </div>;
}

function Confetti() {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVisible(false); return; }
    const animations = Array.from(container.current?.children ?? []).map((particle, i) => {
      const x = ((i * 73 + 19) % 100) / 100 * window.innerWidth;
      const sway = (i % 2 ? 1 : -1) * (30 + (i * 17) % 90);
      const fall = window.innerHeight + 80;
      return particle.animate([
        { transform: `translate3d(${x}px, -30px, 0) rotate(0deg)`, opacity: 0 },
        { transform: `translate3d(${x + sway * .6}px, ${fall * .45}px, 0) rotate(${i * 40}deg)`, opacity: 1, offset: .25 },
        { transform: `translate3d(${x + sway}px, ${fall}px, 0) rotate(${360 + i * 26}deg)`, opacity: 0 },
      ], { duration: 2600 + (i * 97) % 1300, delay: (i * 83) % 600, easing: 'ease-out', fill: 'forwards' });
    });
    const timer = window.setTimeout(() => setVisible(false), 4500);
    return () => { window.clearTimeout(timer); animations.forEach(animation => animation.cancel()); };
  }, []);
  if (!visible) return null;
  return <div ref={container} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
    {Array.from({ length: 44 }, (_, i) => <span key={i} className={`absolute left-0 top-0 block h-3 w-2 ${i % 4 === 0 ? 'bg-white' : i % 4 === 1 ? 'bg-[#6acbff]' : i % 4 === 2 ? 'bg-[#346bff]' : 'bg-[#b2eaff]'}`} />)}
  </div>;
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
  const theme: Theme = won ? 'won' : result?.state === 'claimed' ? 'claimed' : 'waiting';
  const colors = themes[theme];
  const stateLabel = won ? '01 / ACCESS GRANTED' : result?.state === 'claimed' ? '02 / CLAIMED' : result?.state === 'missing' ? '04 / NOT FOUND' : error ? '03 / CONNECTION LOST' : '00 / CONNECTING';
  const heading = won ? <>IT&apos;S<br /><span className={colors.accent}>YOURS.</span></> : result?.state === 'claimed' ? <>TOO<br /><span className={colors.accent}>LATE.</span></> : result?.state === 'missing' ? <>NOT<br /><span className={colors.accent}>FOUND.</span></> : error ? <>SIGNAL<br /><span className={colors.accent}>LOST.</span></> : <>HOLD<br /><span className={colors.accent}>TIGHT.</span></>;

  return <main className={`min-h-dvh overflow-hidden font-mono selection:text-black transition-colors duration-700 ${theme === 'won' ? 'bg-[#07101c] text-[#f2f8ff] selection:bg-[#6acbff]' : theme === 'claimed' ? 'bg-[#161208] text-[#fff9e8] selection:bg-[#ffe05a]' : 'bg-[#090d09] text-[#f2f7e9] selection:bg-[#b9ff52]'}`}>
    {won && <Confetti />}
    <div className="mx-auto flex min-h-dvh max-w-[1440px] flex-col px-5 sm:px-10 lg:px-16">
      <header className={`flex items-center justify-between border-b py-5 transition-colors duration-700 sm:py-7 ${colors.border}`}>
        <div className="flex items-center gap-3"><span aria-hidden="true" className={`grid h-8 w-8 place-items-center border text-[10px] font-black tracking-tight transition-colors duration-700 ${colors.accentBorder} ${colors.accent}`}>GP</span><span className="text-base font-black tracking-[-.06em] sm:text-xl">GPTRUSH<span className={colors.accent}>_</span></span></div>
        <span className={`text-[10px] font-bold tracking-[.14em] sm:text-xs ${colors.muted}`}>ONE LINK <span className={`mx-1 ${colors.accent}`}>/</span> ONE WINNER</span>
      </header>

      <div className="grid flex-1 items-center gap-6 py-9 sm:gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.85fr)] lg:py-12">
        <section className="relative z-10">
          <div className={`mb-8 flex items-center gap-3 text-[11px] font-bold tracking-[.2em] sm:text-xs ${colors.accent}`}><span className={`h-2.5 w-2.5 ${colors.dot}`} />{stateLabel}</div>
          <h1 aria-live="polite" className="text-[clamp(4.2rem,16vw,10rem)] font-black leading-[.84] tracking-[-.105em] sm:text-[clamp(6rem,11vw,10rem)]">{heading}</h1>
          <div className={`mt-8 border-l-2 pl-4 transition-colors duration-700 sm:mt-10 sm:pl-6 ${colors.accentBorder}`}>
            <p className={`text-xs font-bold uppercase tracking-[.18em] ${colors.muted}`}>{title || 'OPENAI CREDIT DROP'}</p>
            <p className="mt-3 max-w-lg text-lg font-bold leading-snug sm:text-xl lg:text-2xl">{won ? 'You got here first. Your OpenAI credits are ready.' : result?.state === 'claimed' ? <>{result.message && <span className={`mb-3 block text-base font-black sm:text-lg ${colors.accent}`}>{result.message}</span>}Someone else scanned first. You were <span className={colors.accent}>{formatGap(result.gapMs)}</span> behind.</> : result?.state === 'missing' ? 'This link does not exist. Double-check it and try again.' : error ? error : 'Checking the signal. This will only take a second.'}</p>
          </div>
        </section>
        <CreditArtifact theme={theme} />
      </div>

      {won && <section className={`relative z-10 mb-8 grid gap-0 border lg:grid-cols-[minmax(0,1fr)_minmax(0,.8fr)] ${colors.accentBorder}`}>
        <div className={`min-w-0 border-b p-5 sm:p-8 lg:border-b-0 lg:border-r ${colors.divider}`}><p className={`text-[11px] font-bold tracking-[.2em] ${colors.accent}`}>YOUR OPENAI CREDIT CODE / REVEALED</p><p className={`mt-3 text-xs leading-5 ${colors.soft}`}>Treat this like a password. Copy it somewhere private and don’t share it publicly.</p><div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 whitespace-pre-wrap break-all rounded border border-current/30 bg-black/20 p-4 font-mono text-xl font-black leading-tight tracking-[.06em] sm:text-2xl" aria-label="Your OpenAI credit code">{result.treasure}</div><button type="button" onClick={copyTreasure} className={`min-h-12 shrink-0 border px-4 text-xs font-black transition hover:text-[#0a0e09] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${colors.outline}`} aria-label="Copy OpenAI credit code">{copied ? 'COPIED' : 'COPY CODE'}</button></div>{copyError && <p role="alert" className="mt-3 text-xs text-[#ff9885]">{copyError}</p>}<p className={`mt-7 text-sm leading-6 ${colors.soft}`}>Your browser can reopen the code for 30 days. Keep this browser profile and its site data.</p></div>
        <div className="min-w-0 p-5 sm:p-8"><p className={`text-[11px] font-bold tracking-[.2em] ${colors.accent}`}>MAKE IT OFFICIAL / OPTIONAL</p><h2 className="mt-4 text-2xl font-black leading-tight sm:text-3xl">PUT YOUR NAME<br />ON THE BOARD.</h2>{savedName ? <p role="status" className={`mt-8 border p-4 text-lg font-bold ${colors.saved}`}>SAVED: {savedName}</p> : <form onSubmit={submitName} className="mt-6"><label htmlFor="winner-name" className={`block text-xs font-bold uppercase tracking-[.15em] ${colors.soft}`}>Your name</label><div className="mt-3 flex flex-col gap-3 sm:flex-row"><input id="winner-name" type="text" autoComplete="name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="ENTER YOUR NAME" className={`min-h-14 min-w-0 flex-1 rounded-none border px-4 text-base font-bold text-white outline-none ${colors.input}`} /><button type="submit" disabled={submitting} className={`min-h-14 shrink-0 px-6 text-sm font-black transition disabled:opacity-60 ${colors.button}`}>{submitting ? 'SAVING...' : 'SUBMIT NAME →'}</button></div>{nameError && <p role="alert" className="mt-3 text-sm text-[#ff9885]">{nameError}</p>}<p className={`mt-4 text-xs leading-5 ${colors.soft}`}>Only your name is shared with the event admin. You can skip this.</p></form>}</div>
      </section>}

      {won && <CreditHowTo />}

      <footer className={`flex flex-wrap items-center justify-between gap-2 border-t py-5 text-[10px] font-bold uppercase tracking-[.16em] sm:text-xs ${colors.border} ${colors.muted}`}><span>GPTRUSH / FIND YOUR MOMENT</span><span>BUILT FOR THE FIRST TO ARRIVE</span></footer>
    </div>
  </main>;
}
