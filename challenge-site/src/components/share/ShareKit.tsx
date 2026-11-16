'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { downloadName, type ShareShape, type ShareTheme } from '@/lib/share-kit';

type Network = 'LinkedIn' | 'X';

type Panel =
  | { kind: 'clipboard'; network: Network; composerUrl: string; blocked: boolean }
  | { kind: 'download'; network: Network; composerUrl: string; blocked: boolean; filename: string }
  | { kind: 'shared'; textCopied: boolean };

type Env = { canShareFiles: boolean; touch: boolean; mac: boolean; imageClipboard: boolean };

const DEFAULT_ENV: Env = { canShareFiles: false, touch: false, mac: true, imageClipboard: true };

function detectEnv(): Env {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
  const mac = /mac|iphone|ipad|ipod/i.test(platform);
  let canShareFiles = false;
  try {
    const probe = new File([new Uint8Array([0])], 'probe.jpg', { type: 'image/jpeg' });
    canShareFiles = typeof nav.canShare === 'function' && nav.canShare({ files: [probe] });
  } catch {
    canShareFiles = false;
  }
  const CI = (window as Window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  let imageClipboard = !!CI && typeof nav.clipboard?.write === 'function';
  if (imageClipboard && CI && typeof (CI as unknown as { supports?: (t: string) => boolean }).supports === 'function') {
    imageClipboard = (CI as unknown as { supports: (t: string) => boolean }).supports('image/png');
  }
  return { canShareFiles, touch: window.matchMedia('(pointer: coarse)').matches, mac, imageClipboard };
}

/** JPEG → PNG via canvas (image clipboards accept PNG only). */
async function toPngBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

function downloadFile(src: string, filename: string) {
  const a = document.createElement('a');
  a.href = src;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function composerUrl(network: Network, text: string): string {
  const t = encodeURIComponent(text);
  return network === 'LinkedIn'
    ? `https://www.linkedin.com/feed/?shareActive=true&text=${t}`
    : `https://x.com/intent/post?text=${t}`;
}

/** Simple post-box sketch (not any network's branding): text lines, an image, a Post button. */
function PostBoxSketch() {
  return (
    <svg viewBox="0 0 220 150" aria-hidden="true" className="h-auto w-40 shrink-0 sm:w-48">
      <rect x="1" y="1" width="218" height="148" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <circle cx="20" cy="20" r="9" fill="#cbd5e1" />
      <rect x="36" y="14" width="70" height="5" rx="2.5" fill="#94a3b8" />
      <rect x="36" y="23" width="44" height="4" rx="2" fill="#cbd5e1" />
      <rect x="12" y="38" width="190" height="4" rx="2" fill="#94a3b8" />
      <rect x="12" y="46" width="160" height="4" rx="2" fill="#94a3b8" />
      <rect x="12" y="54" width="120" height="4" rx="2" fill="#38bdf8" />
      <rect x="12" y="64" width="110" height="62" rx="4" fill="#0b1120" />
      <rect x="12" y="122" width="110" height="4" fill="#f4bc1d" />
      <rect x="50" y="72" width="34" height="38" rx="2" fill="#1e293b" stroke="#f4bc1d" strokeWidth="1.5" />
      <text x="128" y="98" fontSize="11" fontFamily="system-ui, sans-serif" fill="#334155">← pasted</text>
      <rect x="160" y="128" width="50" height="16" rx="8" fill="#2563eb" />
      <text x="185" y="139.5" fontSize="9" fontFamily="system-ui, sans-serif" fill="#fff" textAnchor="middle" fontWeight="700">Post</text>
    </svg>
  );
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-white hover:border-slate-400 hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300';

function ShareCard({ theme, env }: { theme: ShareTheme; env: Env }) {
  const [shape, setShape] = useState<ShareShape>('square');
  const [panel, setPanel] = useState<Panel | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pngCache = useRef(new Map<string, Promise<Blob>>());
  const fileCache = useRef(new Map<string, Promise<File>>());
  const image = theme.images[shape];
  const filename = downloadName(theme.id, shape);
  const headingId = `share-${theme.id}-heading`;

  const png = useCallback((src: string) => {
    let p = pngCache.current.get(src);
    if (!p) {
      p = toPngBlob(src);
      p.catch(() => pngCache.current.delete(src));
      pngCache.current.set(src, p);
    }
    return p;
  }, []);

  const jpegFile = useCallback((src: string, name: string) => {
    let p = fileCache.current.get(src);
    if (!p) {
      p = fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`image ${r.status}`);
          return r.blob();
        })
        .then((b) => new File([b], name, { type: 'image/jpeg' }));
      p.catch(() => fileCache.current.delete(src));
      fileCache.current.set(src, p);
    }
    return p;
  }, []);

  // Warm the cache for the shape on screen so the click handler's clipboard/share call is quick.
  useEffect(() => {
    if (env.canShareFiles) void jpegFile(image.src, filename).catch(() => {});
  }, [env.canShareFiles, image.src, filename, jpegFile]);

  const warm = () => {
    if (!env.touch && env.imageClipboard) void png(image.src).catch(() => {});
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(theme.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copying is blocked in this browser. Select the text above and copy it.');
    }
  };

  const shareFiles = async () => {
    setError(null);
    // Some apps (LinkedIn on iOS) drop the text from a share; put it on the clipboard first.
    let textCopied = false;
    const textWrite = navigator.clipboard?.writeText(theme.text).then(
      () => (textCopied = true),
      () => {},
    );
    try {
      const file = await jpegFile(image.src, filename);
      await navigator.share({ files: [file], text: theme.text, title: theme.heading });
      await textWrite;
      setPanel({ kind: 'shared', textCopied });
    } catch (e) {
      await textWrite;
      if ((e as DOMException)?.name === 'AbortError') {
        if (textCopied) setPanel({ kind: 'shared', textCopied });
        return;
      }
      setError('Sharing did not start. Use Download image, then post it from your app.');
    }
  };

  const postTo = async (network: Network) => {
    setError(null);
    const url = composerUrl(network, theme.text);
    const open = () => !!window.open(url, '_blank', 'noopener');
    if (env.imageClipboard) {
      try {
        // Safari needs the ClipboardItem built synchronously in the click, with a Promise for the data.
        const item = new ClipboardItem({ 'image/png': png(image.src) });
        await navigator.clipboard.write([item]);
        const opened = open();
        setPanel({ kind: 'clipboard', network, composerUrl: url, blocked: !opened });
        return;
      } catch {
        /* fall back to a download */
      }
    }
    downloadFile(image.src, filename);
    const opened = open();
    setPanel({ kind: 'download', network, composerUrl: url, blocked: !opened, filename });
  };

  const copyImageAgain = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png(image.src) })]);
      setCopied(false);
      setError(null);
    } catch {
      downloadFile(image.src, filename);
      if (panel && panel.kind !== 'shared') setPanel({ ...panel, kind: 'download', filename } as Panel);
    }
  };

  const u = encodeURIComponent(theme.pageUrl);
  const t = encodeURIComponent(theme.text);
  const linkRow: Array<[string, string]> = [
    ['X', `https://x.com/intent/post?text=${t}`],
    ['Bluesky', `https://bsky.app/intent/compose?text=${t}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['WhatsApp', `https://wa.me/?text=${t}`],
  ];
  const key = env.mac ? '⌘V' : 'Ctrl+V';
  const showPhoneShare = env.canShareFiles;
  const showDesktop = !env.touch || !env.canShareFiles;

  return (
    <article aria-labelledby={headingId} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
      <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image.src}
            width={image.width}
            height={image.height}
            alt={theme.alt}
            loading="lazy"
            className="h-auto w-full rounded-xl border border-slate-800"
          />
          <div role="radiogroup" aria-label="Image shape" className="mt-3 inline-flex rounded-lg border border-slate-700 p-0.5 text-sm">
            {(['square', 'portrait'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={shape === s}
                onClick={() => {
                  setShape(s);
                  setPanel(null);
                }}
                className={`rounded-md px-3 py-1.5 font-medium ${shape === s ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                {s === 'square' ? 'Square 1:1' : 'Portrait 4:5'}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h2 id={headingId} className="text-xl font-bold text-white">
            {theme.heading}
          </h2>
          <p className="mt-3 whitespace-pre-line break-words rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[15px] leading-relaxed text-slate-200">
            {theme.text}
          </p>

          <div className="mt-4 flex flex-wrap gap-2" onPointerEnter={warm} onFocus={warm}>
            {showPhoneShare ? (
              <button type="button" onClick={shareFiles} className={btnPrimary} aria-label={`Share the ${theme.heading.toLowerCase()} image with its text`}>
                Share image
              </button>
            ) : null}
            {showDesktop ? (
              <>
                <button
                  type="button"
                  onClick={() => postTo('LinkedIn')}
                  className={showPhoneShare ? btnSecondary : btnPrimary}
                  aria-label={`Post the ${theme.heading.toLowerCase()} image on LinkedIn: copies the image and opens LinkedIn with the text filled in`}
                >
                  Post on LinkedIn
                </button>
                <button
                  type="button"
                  onClick={() => postTo('X')}
                  className={btnSecondary}
                  aria-label={`Post the ${theme.heading.toLowerCase()} image on X: copies the image and opens X with the text filled in`}
                >
                  Post image on X
                </button>
              </>
            ) : null}
            <a href={image.src} download={filename} className={btnSecondary} aria-label={`Download the ${shape} image (${filename})`}>
              Download image
            </a>
            <button type="button" onClick={copyText} className={btnSecondary} aria-label="Copy the post text">
              {copied ? 'Text copied' : 'Copy text'}
            </button>
          </div>

          <div role="status" aria-live="polite" className="mt-3">
            {panel?.kind === 'clipboard' || panel?.kind === 'download' ? (
              <div className="flex flex-col gap-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 sm:flex-row sm:items-center">
                <PostBoxSketch />
                <div className="text-sm leading-relaxed text-amber-50">
                  <p className="font-semibold text-white">Almost done:</p>
                  {panel.kind === 'clipboard' ? (
                    <p className="mt-1">
                      press <kbd className="rounded border border-amber-300/50 bg-slate-950 px-1.5 py-0.5 font-mono text-xs">{key}</kbd>
                      {env.mac ? ' (Ctrl+V on Windows)' : ' (⌘V on a Mac)'} in {panel.network} to add the image, then click Post.
                      The text and link are already filled in.
                    </p>
                  ) : (
                    <p className="mt-1">
                      The image is in your Downloads. Click the photo icon in {panel.network} and choose{' '}
                      <span className="font-mono text-xs">{panel.filename}</span> from Downloads, then click Post. The text
                      and link are already filled in.
                    </p>
                  )}
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {panel.kind === 'clipboard' ? (
                      <button type="button" onClick={copyImageAgain} className="font-semibold text-amber-200 underline hover:text-white">
                        Copy image again
                      </button>
                    ) : null}
                    <a href={panel.composerUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-200 underline hover:text-white">
                      {panel.blocked ? `Open ${panel.network}` : `Open ${panel.network} again`}
                    </a>
                    <button type="button" onClick={() => setPanel(null)} className="text-amber-200/80 underline hover:text-white">
                      Done
                    </button>
                  </p>
                  {panel.blocked ? (
                    <p className="mt-2 text-amber-100/80">Your browser blocked the new tab; use the link above.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
            {panel?.kind === 'shared' && panel.textCopied ? (
              <p className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-200">
                Text copied: paste it if it&apos;s missing.
              </p>
            ) : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          </div>

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Or share the link (shows a large card)</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {linkRow.map(([label, href]) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export default function ShareKit({ themes }: { themes: ShareTheme[] }) {
  const [env, setEnv] = useState<Env>(DEFAULT_ENV);
  useEffect(() => {
    // Browser capabilities are only known after mount; the server render shows the desktop buttons.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnv(detectEnv());
  }, []);
  return (
    <div className="space-y-6">
      {themes.map((theme) => (
        <ShareCard key={theme.id} theme={theme} env={env} />
      ))}
    </div>
  );
}
