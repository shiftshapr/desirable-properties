'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import TrackedLink from '@/components/TrackedLink';
import { trackEvent } from '@/lib/analytics';
import { COMMUNITY_REVIEW_EVENT } from '@/lib/community-review-event';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

export default function CommunityReviewEventPanel() {
  useEffect(() => {
    trackEvent('homepage_community_review_impression');
  }, []);

  return (
    <section
      aria-labelledby="community-review-event-heading"
      className="border-b border-cyan-900/40 bg-gradient-to-r from-cyan-950/50 via-slate-900 to-violet-950/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 md:flex-row md:items-center md:gap-10 lg:gap-12">
        <TrackedLink
          href={COMMUNITY_REVIEW_EVENT.dpLandingPath}
          eventName="homepage_community_review_cover_click"
          className="group block w-full shrink-0 overflow-hidden rounded-xl border border-cyan-900/50 bg-slate-950/40 shadow-lg shadow-cyan-950/30 ring-1 ring-white/5 transition hover:border-cyan-700/60 hover:ring-cyan-400/20 md:w-[min(42%,18rem)]"
        >
          <Image
            src={COMMUNITY_REVIEW_EVENT.bookCoverSrc}
            alt={COMMUNITY_REVIEW_EVENT.bookCoverAlt}
            width={800}
            height={1000}
            className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 18rem"
          />
        </TrackedLink>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
            {COMMUNITY_REVIEW_EVENT.shortDate} · Virtual event
          </p>
          <h2
            id="community-review-event-heading"
            className="mt-2 text-2xl font-bold text-white sm:text-3xl"
          >
            The Desirable Properties Community Review Event
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            See how the properties are evolving into requirements, architecture decisions, and
            public infrastructure. Learn how to patch, review, and help shape Version 1.0.
          </p>
          <ul className="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2 sm:text-base">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
              Open review and patching
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
              The governance circuit
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
              Concrete ways to contribute
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" aria-hidden />
              Path toward Version 1.0
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <TrackedLink
              href={COMMUNITY_REVIEW_EVENT.lumaUrl}
              eventName="homepage_community_review_register_click"
              className="inline-flex items-center rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Register now
            </TrackedLink>
            <TrackedLink
              href="/#dps"
              eventName="homepage_community_review_dps_click"
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Review the DPs
            </TrackedLink>
            <TrackedLink
              href={WORKGROUPS_LIST_HREF}
              eventName="homepage_community_review_workgroups_click"
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Join a workgroup
            </TrackedLink>
          </div>
          <p className="mt-5 text-xs text-slate-500 sm:text-sm">
            <TrackedLink
              href={COMMUNITY_REVIEW_EVENT.dpLandingPath}
              eventName="homepage_community_review_overview_click"
              className="text-cyan-300 hover:text-cyan-200"
            >
              Read the full event overview →
            </TrackedLink>
          </p>
        </div>
      </div>
    </section>
  );
}
