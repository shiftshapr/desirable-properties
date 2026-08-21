import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import AllianceBriefingClient from '@/components/onboard/AllianceBriefingClient';
import DynamicPadClient from '@/components/onboard/DynamicPadClient';
import CohortPadClient from '@/components/onboard/CohortPadClient';
import {
  allianceSlugKey,
  getAllianceOrg,
  isPadIndexAliasSlug,
  resolveAllianceSlug,
  resolvePartnerOrgs,
} from '@/lib/hermes-onboard/directory';
import { resolvePadLookup } from '@/lib/hermes-onboard/pad-lookup';
import { generateBriefing } from '@/lib/hermes-onboard/generate';
import { findRosterByDomain, getRosterOrg } from '@/lib/hermes-onboard/roster';
import { listOnboardEvents, loadOnboardSession } from '@/lib/hermes-onboard/store';
import { getOnSettings } from '@/lib/hermes-onboard/settings';
import { parseOnboardTab } from '@/lib/hermes-onboard/tabs';
import { readSession } from '@/lib/auth-session';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  if (isPadIndexAliasSlug(slug)) {
    return {
      title: 'Project Liberty Alliance – DP Studio landing pad',
      description:
        'Welcome pad for Project Liberty Alliance members: find your org landing pad, review full briefings, and explore Desirable Properties Studio (public beta).',
    };
  }
  const org = getAllianceOrg(slug);
  if (org) {
    return {
      title: `${org.name} – DP Studio landing pad`,
      description: org.mission,
    };
  }
  const rosterOrg = getRosterOrg(slug);
  if (rosterOrg) {
    return {
      title: `${rosterOrg.name} – DP Studio landing pad`,
      description: 'Alliance roster match. Full briefing pad in progress.',
    };
  }
  return { title: 'Landing pad' };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function padRedirectPath(canonicalSlug: string, query: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  return `/pad/${encodeURIComponent(canonicalSlug)}${qs ? `?${qs}` : ''}`;
}

function rosterRedirectPath(canonicalSlug: string, query: Record<string, string | string[] | undefined>) {
  return padRedirectPath(canonicalSlug, query);
}

export default async function AllianceBriefingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const query = await searchParams;

  if (isPadIndexAliasSlug(slug)) {
    return <CohortPadClient />;
  }

  const directorySlug = resolveAllianceSlug(slug);
  if (directorySlug) {
    if (directorySlug !== slug) {
      permanentRedirect(padRedirectPath(directorySlug, query));
    }

    const org = getAllianceOrg(slug);
    if (!org) notFound();
    const tabParam = query.tab;
    const settings = await getOnSettings();
    const initialTab = parseOnboardTab(
      Array.isArray(tabParam) ? tabParam[0] : tabParam,
      null,
      settings.defaultTab,
    );

    const auth = await readSession();
    const session = await loadOnboardSession(org.slug);
    let briefing = session.briefing || generateBriefing(org, session);
    if (!briefing.dpDirections?.length) {
      briefing = generateBriefing(org, { ...session, briefing });
    }
    const events = auth ? await listOnboardEvents(org.slug) : [];

    return (
      <AllianceBriefingClient
        initialTab={initialTab}
        initial={{
          org: {
            ...org,
            partnerOrgs: resolvePartnerOrgs(org).map((partner) => ({
              slug: partner.slug,
              name: partner.name,
              mission: partner.mission,
            })),
          },
          session: { ...session, briefing },
          events,
          signedIn: Boolean(auth),
        }}
      />
    );
  }

  const rosterOrg = getRosterOrg(slug);
  if (rosterOrg && rosterOrg.slug !== slug) {
    permanentRedirect(rosterRedirectPath(rosterOrg.slug, query));
  }

  const domainParam = Array.isArray(query.domain) ? query.domain[0] : query.domain;
  if (rosterOrg) {
    return (
      <DynamicPadClient
        status="roster"
        slug={rosterOrg.slug}
        name={rosterOrg.name}
        domain={rosterOrg.domain}
        website={rosterOrg.website}
      />
    );
  }

  if (domainParam) {
    const lookup = resolvePadLookup(domainParam);
    if (
      lookup.slug &&
      (lookup.slug === slug || allianceSlugKey(lookup.slug) === allianceSlugKey(slug))
    ) {
      const rosterFromDomain = findRosterByDomain(domainParam) ?? findRosterByDomain(lookup.domain ?? '');
      if (lookup.status === 'roster' && rosterFromDomain) {
        return (
          <DynamicPadClient
            status="roster"
            slug={rosterFromDomain.slug}
            name={rosterFromDomain.name}
            domain={rosterFromDomain.domain}
            website={rosterFromDomain.website}
          />
        );
      }
      if (lookup.status === 'dynamic') {
        return (
          <DynamicPadClient
            status="dynamic"
            slug={lookup.slug}
            name={lookup.name ?? lookup.domain ?? slug}
            domain={lookup.domain}
            website={lookup.domain ? `https://${lookup.domain}/` : null}
          />
        );
      }
    }
  }

  notFound();
}
