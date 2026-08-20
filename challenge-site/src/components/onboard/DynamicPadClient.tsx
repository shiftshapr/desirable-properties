'use client';

import Link from 'next/link';
import type { PadLookupStatus } from '@/lib/hermes-onboard/types';
import { padHref, padPublicBase } from '@/lib/hermes-onboard/tabs';

type Props = {
  status: Extract<PadLookupStatus, 'roster' | 'dynamic'>;
  slug: string;
  name: string;
  domain: string | null;
  website: string | null;
};

const STATUS_COPY: Record<
  Props['status'],
  { badge: string; headline: string; lead: string; cta: string }
> = {
  roster: {
    badge: 'Alliance roster match',
    headline: 'Your landing pad is on the way',
    lead:
      'We matched your organization on the public Project Liberty Alliance roster. A full briefing pad has not been published yet. We are building it from your public corpus next.',
    cta: 'Claim this pad when it goes live',
  },
  dynamic: {
    badge: 'New organization',
    headline: 'We do not have a pad for this site yet',
    lead:
      'This website is not in our Alliance roster prework yet. You can still request a landing pad and help us add your public corpus.',
    cta: 'Request a landing pad',
  },
};

export default function DynamicPadClient({ status, slug, name, domain, website }: Props) {
  const copy = STATUS_COPY[status];
  const padUrl = `${padPublicBase()}${padHref(slug)}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">
        Desirable Properties Studio · Public beta
      </p>
      <p className="mt-3 inline-flex rounded-full border border-amber-700/60 bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-200">
        {copy.badge}
      </p>
      <h1 className="mt-4 text-3xl font-bold text-white sm:text-4xl">{name}</h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-300">{copy.headline}</p>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">{copy.lead}</p>
      <dl className="mt-6 space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm">
        <div>
          <dt className="text-slate-500">Pad slug</dt>
          <dd className="mt-1 font-mono text-slate-200">{slug}</dd>
        </div>
        {domain ? (
          <div>
            <dt className="text-slate-500">Website</dt>
            <dd className="mt-1">
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-cyan-400 hover:text-cyan-200"
                >
                  {domain}
                </a>
              ) : (
                <span className="font-mono text-slate-200">{domain}</span>
              )}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500">Reserved URL</dt>
          <dd className="mt-1 font-mono text-xs text-slate-300 sm:text-sm">{padUrl}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href={padHref(slug, 'community')}
          className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
        >
          {copy.cta}
        </Link>
        <Link
          href="/pad"
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
        >
          Back to pad lookup
        </Link>
      </div>
      {status === 'dynamic' ? (
        <p className="mt-6 text-sm text-slate-500">
          Project Liberty Alliance members appear on{' '}
          <a
            href="https://www.projectliberty.io/alliance/"
            target="_blank"
            rel="noreferrer noopener"
            className="text-cyan-400 hover:text-cyan-200"
          >
            projectliberty.io/alliance
          </a>
          . If you belong there, tell us and we will add you to the roster.
        </p>
      ) : null}
    </div>
  );
}
