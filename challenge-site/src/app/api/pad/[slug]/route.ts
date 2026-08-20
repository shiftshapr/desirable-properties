import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { getAllianceOrg, isAllianceSlug, resolvePartnerOrgs } from '@/lib/hermes-onboard/directory';
import { generateBriefing } from '@/lib/hermes-onboard/generate';
import {
  actorFromSession,
  appendOnboardEvent,
  listOnboardEvents,
  loadOnboardSession,
  saveOnboardSession,
} from '@/lib/hermes-onboard/store';
import type { NextStep, OnboardConsent } from '@/lib/hermes-onboard/types';
import { getHermesChatUrl } from '@/lib/web3auth-config';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';

function emailDomain(email: string | null | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  return email.split('@')[1]?.toLowerCase() || null;
}

function requireOrg(slug: string) {
  if (!isAllianceSlug(slug)) return null;
  return getAllianceOrg(slug);
}

type ActionBody = {
  action?: string;
  mission?: boolean;
  sources?: boolean;
  partners?: boolean;
  values?: string[];
  consent?: Partial<OnboardConsent>;
  moveId?: string;
  stepId?: string;
  primitives?: string[];
};

async function payloadFor(slug: string, signedIn: boolean) {
  const org = requireOrg(slug);
  if (!org) return null;
  const session = await loadOnboardSession(org.slug);
  let briefing = session.briefing || generateBriefing(org, session);
  if (!briefing.dpDirections?.length) {
    briefing = generateBriefing(org, { ...session, briefing });
  }
  const events = signedIn ? await listOnboardEvents(org.slug) : [];
  return {
    org: {
      ...org,
      partnerOrgs: resolvePartnerOrgs(org).map((partner) => ({
        slug: partner.slug,
        name: partner.name,
        mission: partner.mission,
      })),
    },
    session: {
      ...session,
      briefing,
    },
    events,
    signedIn,
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const auth = await readSession();
  const data = await payloadFor(slug, Boolean(auth));
  if (!data) return NextResponse.json({ error: 'Unknown Alliance org' }, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const org = requireOrg(slug);
  if (!org) return NextResponse.json({ error: 'Unknown Alliance org' }, { status: 404 });

  const padSlug = org.slug;
  const auth = await readSession();
  if (!auth) {
    return NextResponse.json({ error: 'Sign in required to save this briefing' }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ActionBody;
  const action = String(body.action || '');
  let session = await loadOnboardSession(padSlug);
  const actor = actorFromSession(auth);

  const persist = async (kind: string, payload: Record<string, unknown> = {}) => {
    if (!session.consent.sessionMemory && action !== 'consent' && action !== 'claim') {
      return NextResponse.json(
        { error: 'Turn on session memory in Rights & consent before saving.' },
        { status: 400 },
      );
    }
    session.slug = padSlug;
    session = await saveOnboardSession(session);
    await appendOnboardEvent({ slug: padSlug, kind, actor, payload });
    return NextResponse.json(await payloadFor(slug, true));
  };

  if (action === 'consent') {
    const next: OnboardConsent = {
      publicRead: body.consent?.publicRead !== false,
      sessionMemory: Boolean(body.consent?.sessionMemory),
      crossSubjectLearning: Boolean(body.consent?.crossSubjectLearning),
    };
    session.consent = next;
    session.slug = padSlug;
    session = await saveOnboardSession(session);
    await appendOnboardEvent({ slug: padSlug, kind: 'consent', actor, payload: { consent: next } });
    return NextResponse.json(await payloadFor(slug, true));
  }

  if (action === 'confirm') {
    session.confirmed = {
      ...session.confirmed,
      mission: body.mission ?? session.confirmed.mission,
      sources: body.sources ?? session.confirmed.sources,
      partners: body.partners ?? session.confirmed.partners,
      values: body.values ?? session.confirmed.values,
    };
    session.briefing = generateBriefing(org, session);
    session.nextSteps = session.briefing.nextSteps;
    return persist('confirm', { confirmed: session.confirmed });
  }

  if (action === 'generate') {
    session.briefing = generateBriefing(org, session);
    session.nextSteps = session.briefing.nextSteps;
    return persist('generate', { briefingId: session.briefing.id });
  }

  if (action === 'pin-move' || action === 'dismiss-move') {
    const moveId = String(body.moveId || '');
    if (!moveId) return NextResponse.json({ error: 'moveId required' }, { status: 400 });
    if (action === 'pin-move') {
      session.pinnedMoveIds = Array.from(new Set([...session.pinnedMoveIds, moveId]));
      session.dismissedMoveIds = session.dismissedMoveIds.filter((id) => id !== moveId);
    } else {
      session.dismissedMoveIds = Array.from(new Set([...session.dismissedMoveIds, moveId]));
      session.pinnedMoveIds = session.pinnedMoveIds.filter((id) => id !== moveId);
    }
    session.briefing = generateBriefing(org, session);
    session.nextSteps = session.briefing.nextSteps;
    return persist(action, { moveId });
  }

  if (action === 'primitives') {
    const primitives = Array.isArray(body.primitives) ? body.primitives.map(String) : [];
    session.enabledPrimitives = primitives;
    session.briefing = generateBriefing(org, session);
    session.nextSteps = session.briefing.nextSteps;
    return persist('primitives', { primitives });
  }

  if (action === 'claim') {
    if (session.claimedBy && session.claimedBy.userId !== auth.userId) {
      return NextResponse.json({ error: 'This briefing is already claimed' }, { status: 409 });
    }
    const domain = emailDomain(auth.email);
    const domainMatched = Boolean(domain && org.claimDomains.includes(domain));
    session.claimedBy = {
      userId: auth.userId,
      email: auth.email || null,
      displayName: auth.displayName || null,
      claimedAt: new Date().toISOString(),
      domainMatched,
    };
    session.briefing = generateBriefing(org, session);
    session.nextSteps = session.briefing.nextSteps;
    session.slug = padSlug;
    session = await saveOnboardSession(session);
    await appendOnboardEvent({
      slug: padSlug,
      kind: 'claim',
      actor,
      payload: { domainMatched },
    });
    return NextResponse.json(await payloadFor(slug, true));
  }

  if (action === 'accept-step') {
    const stepId = String(body.stepId || '');
    if (!stepId) return NextResponse.json({ error: 'stepId required' }, { status: 400 });
    const briefing = session.briefing || generateBriefing(org, session);
    const steps: NextStep[] = (session.nextSteps.length ? session.nextSteps : briefing.nextSteps).map(
      (step) => (step.id === stepId ? { ...step, status: 'accepted' } : step),
    );
    session.nextSteps = steps;
    if (session.briefing) session.briefing = { ...session.briefing, nextSteps: steps };
    return persist('accept-step', { stepId });
  }

  if (action === 'community-chat') {
    if (session.communityThreadId) {
      return NextResponse.json(await payloadFor(slug, true));
    }
    if (!session.consent.sessionMemory) {
      return NextResponse.json(
        { error: 'Turn on session memory in Rights & consent before creating Community Chat.' },
        { status: 400 },
      );
    }
    const title = `${org.shortName} landing pad`.slice(0, 120);
    const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/threads`, {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({
        verifierId: auth.verifierId,
        govHubUserId: auth.userId,
        displayName: auth.displayName,
        title,
        surface: `desirableproperties.org/pad/${org.slug}`,
        threadKind: 'group',
        groupTitle: title,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await upstream.json().catch(() => ({}));
    const threadId = data.thread?.id;
    if (!upstream.ok || !threadId) {
      return NextResponse.json(
        { error: data.error || 'Could not create Community Chat' },
        { status: upstream.status || 502 },
      );
    }
    session.communityThreadId = String(threadId);
    session.communityThreadTitle = title;
    session.briefing = generateBriefing(org, session);
    session.nextSteps = session.briefing.nextSteps;
    return persist('community-chat', { threadId: session.communityThreadId });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
