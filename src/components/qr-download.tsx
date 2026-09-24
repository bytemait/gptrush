'use client';

import QRCode from 'react-qr-code';
import { useRef, useState } from 'react';

const OUTPUT_SIZE = 1024;

export default function QRDownload({ value, title, onClose }: { value: string; title: string; onClose: () => void }) {
  const qrRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    setBusy(true); setError('');
    try {
      const svgSource = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      try {
        const image = new Image();
        image.decoding = 'sync';
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is unavailable in this browser.');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        const quietZone = 48;
        context.imageSmoothingEnabled = false;
        context.drawImage(image, quietZone, quietZone, OUTPUT_SIZE - quietZone * 2, OUTPUT_SIZE - quietZone * 2);
        const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not create the QR image.')), 'image/png'));
        const downloadUrl = URL.createObjectURL(png);
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = `${title.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'gptrush'}-qr-1024.png`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      } finally { URL.revokeObjectURL(url); }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate this QR code.');
    } finally { setBusy(false); }
  }

  return <div role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
    <section role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title" className="my-auto w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><h2 id="qr-dialog-title" className="text-lg font-bold text-[#262b23]">QR code</h2><p className="mt-1 break-words text-xs text-[#77796e]">{title}</p></div><button type="button" onClick={onClose} aria-label="Close QR code" className="rounded-lg border border-[#e7e7df] px-3 py-2 text-xs font-semibold text-[#5f6258] hover:bg-[#f7f8f4]">Close</button></div>
      <div className="mx-auto mt-5 w-full max-w-[320px] border border-[#ecece7] bg-white p-3"><div ref={qrRef} className="aspect-square w-full"><QRCode value={value} size={1024} level="H" title={`${title} QR code`} style={{ display: 'block', height: '100%', width: '100%' }} /></div></div>
      <p className="mt-3 text-center text-[10px] text-[#898b80]">High-resolution PNG · 1024 × 1024 pixels</p>
      {error && <p role="alert" className="mt-3 text-center text-xs text-[#ae503a]">{error}</p>}
      <button type="button" disabled={busy} onClick={() => void download()} className="mt-5 min-h-12 w-full rounded-xl bg-[#c5ef7c] px-5 text-sm font-bold text-[#35451f] transition hover:bg-[#b8e76a] disabled:opacity-60">{busy ? 'Generating QR…' : 'Download 1024 × 1024 PNG'}</button>
    </section>
  </div>;
}
