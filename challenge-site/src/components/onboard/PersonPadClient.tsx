'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { padPublicBase } from '@/lib/hermes-onboard/tabs';
import type { PersonPadRecord } from '@/lib/hermes-onboard/person-pad-store';

const PERSON_TABS = [
  { id: 'brief', label: 'Brief' },
  { id: 'work', label: 'Work & perspectives' },
  { id: 'dp', label: 'Desirable Properties invite' },
  { id: 'community', label: 'Community Chat' },
] as const;

type PersonTabId = (typeof PERSON_TABS)[number]['id'];

function parseTab(value: string | null): PersonTabId {
  if (value && PERSON_TABS.some((row) => row.id === value)) return value as PersonTabId;
  return 'brief';
}

function externalHref(raw: string): string {
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return raw;
  return `https://${raw.replace(/^\/+/, '')}`;
}

function bioExcerpt(record: PersonPadRecord): string | null {
  if (record.bioText?.trim()) return record.bioText.trim();
  if (record.profilePaste?.trim()) return record.profilePaste.trim().slice(0, 320);
  return null;
}

export default function PersonPadClient({ initial }: { initial: PersonPadRecord }) {
  const [tab, setTab] = useState<PersonTabId>('brief');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setTab(parseTab(new URLSearchParams(window.location.search).get('tab')));
  }, []);

  const selectTab = (id: PersonTabId) => {
    setTab(id);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('tab', id);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  };

  const padUrl = `${padPublicBase()}/pad/person/${encodeURIComponent(initial.slug)}`;
  const profileLinks = useMemo(() => {
    const rows: { label: string; href: string }[] = [];
    if (initial.linkedinUrl) rows.push({ label: 'LinkedIn profile', href: externalHref(initial.linkedinUrl) });
    if (initial.cvUrl) rows.push({ label: 'CV / resume', href: externalHref(initial.cvUrl) });
    return rows;
  }, [initial.linkedinUrl, initial.cvUrl]);

  const excerpt = bioExcerpt(initial);
  const hasWorkContent =
    initial.workLinks.length > 0 ||
    initial.perspectiveLinks.length > 0 ||
    initial.uploadedDocs.length > 0 ||
    initial.selectedSources.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
        Desirable Properties Studio · Public beta
      </p>
      <p className="mt-3 inline-flex rounded-full border border-cyan-700/50 bg-cyan-950/30 px-3 py-1 text-xs font-medium text-cyan-200">
        Person landing pad
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{initial.displayName}</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">
        We started from your public links and the sources you chose. This is not a score or ranking.
        It is a place to review what we heard and follow your work into Desirable Properties.
      </p>
      <p className="mt-2 font-mono text-xs text-slate-500">{padUrl}</p>

      <nav className="mt-8 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {PERSON_TABS.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => selectTab(row.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === row.id
                ? 'bg-cyan-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {row.label}
          </button>
        ))}
      </nav>

      {tab === 'brief' ? (
        <section className="mt-8 space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold text-white">What we used</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              This pad lists the profile links, pasted text, and public sources you selected. Full
              corpus synthesis and briefing generation can follow once you claim the pad.
            </p>
            {profileLinks.length ? (
              <ul className="mt-4 space-y-2 text-sm">
                {profileLinks.map((row) => (
                  <li key={row.href}>
                    <a
                      href={row.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-cyan-400 hover:text-cyan-200"
                    >
                      {row.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No profile URLs on file yet.</p>
            )}
          </div>

          {excerpt ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Bio excerpt</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{excerpt}</p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5">
              <h2 className="text-lg font-semibold text-white">No pasted bio yet</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                LinkedIn and other private profiles cannot be read automatically. Add a bio, pasted
                profile text, or CV on the person form.
              </p>
              <Link
                href="/pad"
                className="mt-4 inline-flex text-sm font-medium text-cyan-400 hover:text-cyan-200"
              >
                Back to pad lookup to add paste or upload
              </Link>
            </div>
          )}

          {initial.selectedSources.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Sources you chose</h2>
              <ul className="mt-4 space-y-3">
                {initial.selectedSources.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm"
                  >
                    <p className="font-medium text-white">{row.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{row.source}</p>
                    <p className="mt-1 text-slate-400">{row.snippet}</p>
                    {row.url.startsWith('http') || row.url.startsWith('/') ? (
                      <a
                        href={externalHref(row.url)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 inline-block break-all text-cyan-400 hover:text-cyan-200"
                      >
                        {row.url}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-lg font-semibold text-white">Summary (stub)</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              We heard your public footprint through the links and sources below. When you are ready,
              use Community Chat to tell us what we missed or what matters most for your Desirable
              Properties work.
            </p>
          </div>
        </section>
      ) : null}

      {tab === 'work' ? (
        <section className="mt-8 space-y-6">
          {initial.selectedSources.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Selected public sources</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {initial.selectedSources.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm"
                  >
                    <p className="font-medium text-cyan-200">{row.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.source}</p>
                    {row.url.startsWith('http') || row.url.startsWith('/') ? (
                      <a
                        href={externalHref(row.url)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 block break-all text-cyan-400 hover:text-cyan-200"
                      >
                        Open
                      </a>
                    ) : (
                      <p className="mt-2 text-slate-400">{row.snippet}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {initial.workLinks.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Work links</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {initial.workLinks.map((href) => (
                  <li key={href}>
                    <a
                      href={externalHref(href)}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="break-all text-cyan-400 hover:text-cyan-200"
                    >
                      {href}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {initial.perspectiveLinks.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Perspectives</h2>
              <ul className="mt-4 space-y-3">
                {initial.perspectiveLinks.map((row) => (
                  <li
                    key={row.raw}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm"
                  >
                    {row.known && row.title ? (
                      <>
                        <Link href={row.href} className="font-medium text-cyan-300 hover:text-cyan-200">
                          {row.title}
                        </Link>
                        <p className="mt-1 text-slate-500">Known perspective on desirableproperties.org</p>
                      </>
                    ) : (
                      <a
                        href={externalHref(row.href)}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="break-all text-cyan-400 hover:text-cyan-200"
                      >
                        {row.raw}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {initial.uploadedDocs.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
              <h2 className="text-lg font-semibold text-white">Uploaded papers</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {initial.uploadedDocs.map((doc) => (
                  <li key={doc.id}>
                    {doc.filename}{' '}
                    <span className="text-slate-500">({Math.round(doc.size / 1024)} KB)</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!hasWorkContent ? (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/20 p-5">
              <p className="text-sm text-slate-400">
                No work links, perspectives, or selected sources yet. Paste a bio or upload a CV on
                the person form, then choose public items to consider.
              </p>
              <Link
                href="/pad"
                className="mt-4 inline-flex text-sm font-medium text-cyan-400 hover:text-cyan-200"
              >
                Back to pad lookup
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'dp' ? (
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-lg font-semibold text-white">Desirable Properties invite</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Org pads map public corpus to Desirable Properties and patch ideas. Person pads start from
            your profile and published work. Follow a perspective or work link until it becomes a patch
            idea you want to discuss.
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Explore the{' '}
            <Link href="/challenge" className="text-cyan-400 hover:text-cyan-200">
              Desirable Properties Challenge
            </Link>{' '}
            or read{' '}
            <Link href="/perspectives/a-fork-in-the-web" className="text-cyan-400 hover:text-cyan-200">
              A Fork in the Web
            </Link>
            .
          </p>
        </section>
      ) : null}

      {tab === 'community' ? (
        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <h2 className="text-lg font-semibold text-white">Community Chat</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Sign in to start a Community Chat thread for this person pad. Claim and chat creation will
            ship in a follow-up; for now, use the org pad Community Chat pattern as the model.
          </p>
          <Link
            href="/pad"
            className="mt-6 inline-flex rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
          >
            Back to pad lookup
          </Link>
        </section>
      ) : null}

      <div className="mt-10">
        <Link href="/pad" className="text-sm text-cyan-400 hover:text-cyan-200">
          Back to pad lookup
        </Link>
      </div>
    </div>
  );
}
