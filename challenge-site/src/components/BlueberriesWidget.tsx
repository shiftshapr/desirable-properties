'use client';

import { useEffect, useState } from 'react';

type BlueberryItem = {
  id: string;
  label: string;
  description: string;
  kind: string;
  govhubMessageId: string | null;
  govhubUrl: string | null;
  dpIds: string[];
  requiresAcceptance: boolean;
};

type BlueberriesPayload = {
  available: boolean;
  introText: string;
  unavailableMessage: string;
  items: BlueberryItem[];
};

const KIND_LABELS: Record<string, string> = {
  challenge: 'Challenge',
  govhub_action: 'Gov Hub',
  reply: 'Canopi reply',
  custom: 'Activity',
};

export default function BlueberriesWidget({ embedded = false }: { embedded?: boolean }) {
  const [payload, setPayload] = useState<BlueberriesPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/blueberries');
        const data = await res.json();
        if (!cancelled && res.ok && data.ok !== false) {
          setPayload({
            available: data.available !== false,
            introText: String(data.introText || ''),
            unavailableMessage: String(data.unavailableMessage || ''),
            items: Array.isArray(data.items) ? data.items : [],
          });
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className={embedded ? '' : 'border-b border-slate-800 bg-slate-900/40'}>
        <div className={embedded ? '' : 'mx-auto max-w-6xl px-4 py-12 sm:px-6'}>
          <div className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-950/40" />
        </div>
      </section>
    );
  }

  if (!payload) return null;

  const showItems = payload.available && payload.items.length > 0;

  return (
    <section id="blueberries" className={embedded ? '' : 'border-b border-slate-800 bg-slate-900/40'}>
      <div className={embedded ? '' : 'mx-auto max-w-6xl px-4 py-16 sm:px-6'}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl" aria-hidden>
            🫐
          </span>
          <h2 className="text-3xl font-bold text-white">Blueberries</h2>
          <span className="rounded-full border border-cyan-800/60 bg-cyan-950/40 px-3 py-0.5 text-xs font-medium text-cyan-300">
            Optional extras
          </span>
        </div>

        {payload.introText ? (
          <div
            className="prose prose-invert mt-4 max-w-3xl text-lg leading-relaxed text-slate-300 prose-a:text-cyan-300"
            dangerouslySetInnerHTML={{ __html: payload.introText.replace(/\n/g, '<br/>') }}
          />
        ) : (
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">
            Optional participation activities beyond the core challenge paths – nutritious extras
            you can pick up along the way.
          </p>
        )}

        {!payload.available ? (
          <p className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-sm text-slate-400">
            {payload.unavailableMessage ||
              'Blueberries are not available right now. Check back during the active challenge window.'}
          </p>
        ) : null}

        {showItems ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {payload.items.map((item) => (
              <li
                key={item.id}
                className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-white">{item.label}</h3>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    {KIND_LABELS[item.kind] || item.kind}
                  </span>
                  {item.requiresAcceptance ? (
                    <span className="rounded-full border border-violet-800/60 bg-violet-950/40 px-2 py-0.5 text-[10px] text-violet-300">
                      Requires acceptance
                    </span>
                  ) : null}
                </div>
                {item.description ? (
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-400">{item.description}</p>
                ) : null}
                {item.dpIds.length ? (
                  <p className="mt-3 text-xs text-slate-500">
                    Related: {item.dpIds.join(', ')}
                  </p>
                ) : null}
                {item.govhubUrl ? (
                  <a
                    href={item.govhubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex w-fit items-center rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600"
                  >
                    Open activity →
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : payload.available ? (
          <p className="mt-6 text-sm text-slate-500">No activities are scheduled right now.</p>
        ) : null}
      </div>
    </section>
  );
}
