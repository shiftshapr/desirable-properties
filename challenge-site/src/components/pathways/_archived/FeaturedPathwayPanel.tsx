'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import DpSealBadge from '@/components/badges/DpSealBadge';
import PearlMark from '@/components/badges/PearlMark';
import TrackedLink from '@/components/TrackedLink';
import { trackEvent } from '@/lib/analytics';
import type { PathwayParticipationBand } from '@/lib/dp-event-series-store';
import { FORK_SERIES_TOTAL_ESTIMATE_LABEL } from '@/lib/dp-event-series-seed';
import { forkSeriesBadgeTopLabel } from '@/lib/dp-series-badges';

const FORK_HERO_SRC =
  '/images/perspectives/a-fork-in-the-web/a-fork-in-the-web-hero-draft.webp';
const FORK_HERO_ALT =
  'A luminous digital road forks above a glowing web, with one path narrowing into an AI gate and the other opening into shared human-centered layers.';

type Props = {
  participation: PathwayParticipationBand | null;
};

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

function ParticipationBand({ participation }: { participation: PathwayParticipationBand }) {
  const seriesHref = `/series/${participation.slug}`;
  const seriesBadgeHref = `${seriesHref}#series-badge`;

  return (
    <div
      id="pathway-participation-band"
      className="border-t border-violet-900/35 bg-slate-950/45"
      aria-labelledby="pathway-participation-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/90">
              Workshop series
            </p>
            <h3
              id="pathway-participation-heading"
              className="mt-2 text-xl font-bold text-white sm:text-2xl"
            >
              {participation.title}
            </h3>
            {participation.subtitle ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {participation.subtitle}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-slate-400">
              {participation.sessions.length} online sessions · {FORK_SERIES_TOTAL_ESTIMATE_LABEL}{' '}
              with pre-read &amp; questions · attend or watch
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {participation.badgeImageUrl ? (
                <TrackedLink
                  href={seriesBadgeHref}
                  eventName="homepage_series_badge_click"
                  className="shrink-0 rounded-full transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                  aria-label={`${participation.title} series badge`}
                >
                  <DpSealBadge
                    centerSrc={participation.badgeImageUrl}
                    topLabel={forkSeriesBadgeTopLabel(participation.slug, participation.title)}
                    size={40}
                    alt={`${participation.title} series badge`}
                  />
                </TrackedLink>
              ) : (
                <TrackedLink
                  href={seriesBadgeHref}
                  eventName="homepage_series_badge_click"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-violet-800/60 bg-violet-950/50 text-lg transition hover:border-violet-600/80 hover:bg-violet-900/50"
                  aria-label={`${participation.title} series badge`}
                >
                  ✦
                </TrackedLink>
              )}
              <div className="min-w-0 text-sm text-slate-300">
                <p>
                  Earn the{' '}
                  <TrackedLink
                    href={seriesBadgeHref}
                    eventName="homepage_series_badge_click"
                    className="font-medium text-cyan-300 hover:text-cyan-200"
                  >
                    series badge
                  </TrackedLink>{' '}
                  – complete all {participation.sessionsRequiredCount} sessions + questions
                </p>
                {participation.pearlBadgeCode ? (
                  <p className="mt-1 flex items-center gap-1.5 text-slate-500">
                    <PearlMark size={16} />
                    <span>
                      Optional{' '}
                      <TrackedLink
                        href={`${seriesHref}/pearl`}
                        eventName="homepage_pearl_track_click"
                        className="text-violet-300 hover:text-violet-200"
                      >
                        PEARL badge enhancement
                      </TrackedLink>
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 lg:w-auto lg:min-w-[18rem]">
            <div className="flex flex-wrap gap-2" role="list" aria-label="Workshop sessions">
              {participation.sessions.map((session) => (
                <TrackedLink
                  key={session.slug}
                  href={`${seriesHref}/session/${session.sessionNumber}`}
                  eventName="homepage_series_session_click"
                  eventPayload={{ session: session.sessionNumber }}
                  title={session.title}
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-700/60 hover:bg-cyan-950/30 hover:text-cyan-100"
                  role="listitem"
                >
                  {session.sessionNumber}
                </TrackedLink>
              ))}
            </div>
            <TrackedLink
              href={seriesHref}
              eventName="homepage_series_click"
              className="inline-flex items-center justify-center rounded-lg bg-violet-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
            >
              Join the workshop series →
            </TrackedLink>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturedPathwayPanel({ participation }: Props) {
  useEffect(() => {
    trackEvent('homepage_ai_pathway_impression');
    if (participation) {
      trackEvent('homepage_series_band_impression', { series: participation.slug });
    }
  }, [participation]);

  return (
    <section
      aria-labelledby="featured-pathway-heading"
      className="border-b border-violet-900/40 bg-gradient-to-r from-violet-950/50 via-slate-900 to-cyan-950/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 md:flex-row md:items-center md:gap-10 lg:gap-12">
        <TrackedLink
          href="/perspectives/a-fork-in-the-web"
          eventName="homepage_fork_article_click"
          className="group block w-full shrink-0 overflow-hidden rounded-xl border border-violet-900/50 bg-slate-950/40 shadow-lg shadow-violet-950/30 ring-1 ring-white/5 transition hover:border-violet-700/60 hover:ring-violet-400/20 md:w-[min(48%,32rem)]"
        >
          <Image
            src={FORK_HERO_SRC}
            alt={FORK_HERO_ALT}
            width={1586}
            height={992}
            className="aspect-[1586/992] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 32rem"
          />
        </TrackedLink>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <LayeredSpaceMark />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/90">
                Featured Pathway
              </p>
              <h2
                id="featured-pathway-heading"
                className="featured-pathway-heading mt-2 text-2xl font-bold text-white sm:text-3xl"
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
            Explore a pro-human pathway through the Desirable Properties – and help identify what
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
              href="/perspectives/a-fork-in-the-web"
              eventName="homepage_fork_article_click"
              className="inline-flex items-center rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-400"
            >
              Read: A Fork in the Web →
            </TrackedLink>
          </div>
          <p className="mt-5 text-xs text-slate-500 sm:text-sm">
            AI is one doorway into the project, not its boundary.
          </p>
        </div>
      </div>

      {participation ? <ParticipationBand participation={participation} /> : null}
    </section>
  );
}
