import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AllianceBriefingClient from '@/components/onboard/AllianceBriefingClient';
import { getAllianceOrg, resolvePartnerOrgs } from '@/lib/hermes-onboard/directory';
import { generateBriefing } from '@/lib/hermes-onboard/generate';
import { listOnboardEvents, loadOnboardSession } from '@/lib/hermes-onboard/store';
import { parseOnboardTab } from '@/lib/hermes-onboard/tabs';
import { readSession } from '@/lib/auth-session';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const org = getAllianceOrg(slug);
  if (!org) return { title: 'Alliance briefing' };
  return {
    title: `${org.name} – Hermes Alliance briefing`,
    description: org.mission,
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AllianceBriefingPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const org = getAllianceOrg(slug);
  if (!org) notFound();

  const query = await searchParams;
  const tabParam = query.tab;
  const initialTab = parseOnboardTab(
    Array.isArray(tabParam) ? tabParam[0] : tabParam,
    null,
  );

  const auth = await readSession();
  const session = await loadOnboardSession(slug);
  let briefing = session.briefing || generateBriefing(org, session);
  if (!briefing.dpDirections?.length) {
    briefing = generateBriefing(org, { ...session, briefing });
  }
  const events = auth ? await listOnboardEvents(slug) : [];

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
