import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AllianceBriefingClient from '@/components/onboard/AllianceBriefingClient';
import { getAllianceOrg, resolvePartnerOrgs } from '@/lib/hermes-onboard/directory';
import { generateBriefing } from '@/lib/hermes-onboard/generate';
import { listOnboardEvents, loadOnboardSession } from '@/lib/hermes-onboard/store';
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

export default async function AllianceBriefingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const org = getAllianceOrg(slug);
  if (!org) notFound();

  const auth = await readSession();
  const session = await loadOnboardSession(slug);
  const briefing = session.briefing || generateBriefing(org, session);
  const events = auth ? await listOnboardEvents(slug) : [];

  return (
    <AllianceBriefingClient
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
