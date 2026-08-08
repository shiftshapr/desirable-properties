'use client';

import { useEffect } from 'react';
import TrackedLink from '@/components/TrackedLink';
import { trackEvent } from '@/lib/analytics';

/** Small layered-space mark: plural layers, AI as one among several. */
function LayeredSpaceMark() {
  return (
    <svg
      viewBox="0 0 120 88"
      className="h-16 w-[5.5rem] shrink-0 text-cyan-300/80 sm:h-20 sm:w-28"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="48"
        width="104"
        height="28"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <rect
        x="18"
        y="32"
        width="84"
        height="24"
        rx="5"
        fill="none"
        stroke="#a78bfa"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />
      <rect
        x="28"
        y="16"
        width="64"
        height="22"
        rx="5"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.7"
        strokeWidth="1.75"
      />
      <circle cx="60" cy="27" r="3.5" fill="#67e8f9" fillOpacity="0.9" />
      <text
        x="60"
        y="58"
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="8"
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        layers
      </text>
    </svg>
  );
}

export default function FeaturedPathwayPanel() {
  useEffect(() => {
    trackEvent('homepage_ai_pathway_impression');
  }, []);

  return (
    <section
      aria-labelledby="featured-pathway-heading"
      className="border-b border-violet-900/40 bg-gradient-to-r from-violet-950/50 via-slate-900 to-cyan-950/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <LayeredSpaceMark />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/90">
                Featured Pathway
              </p>
              <h2
                id="featured-pathway-heading"
                className="mt-2 text-2xl font-bold text-white sm:text-3xl"
              >
                AI &amp; Human Agency
              </h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            AI may become the primary interface between people and the digital world. What
            properties would ensure that humans and communities retain agency over context,
            judgment, memory, identity, and digital space?
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Explore a pro-human pathway through the Desirable Properties—and help identify what
            may still be missing.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <TrackedLink
              href="/pathways/ai-human-agency"
              eventName="homepage_ai_pathway_click"
              className="inline-flex items-center rounded-lg bg-cyan-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              Explore AI &amp; Human Agency →
            </TrackedLink>
            <TrackedLink
              href="/perspectives/the-fork-in-the-web"
              eventName="homepage_fork_article_click"
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Read: The Fork in the Web →
            </TrackedLink>
          </div>
          <p className="mt-5 text-xs text-slate-500 sm:text-sm">
            AI is one doorway into the project, not its boundary.
          </p>
        </div>
      </div>
    </section>
  );
}
