import { classifyDiscussPost } from '@/lib/discuss-patch';
import { canopiPageIdFromUrl, DP_CANOPI_BOOK_ORIGIN } from '@/lib/dp-canopi-chapters';
import { searchCanopiPosts } from '@/lib/dp-canopi-search';
import {
  applyPatchVerification,
  getOrCreatePearl,
  touchPatchCheck,
  type EventSeriesPearl,
} from '@/lib/dp-event-series-store';
import { fetchDraftProposals, fetchLayerActivityEvents, govhubUrl } from '@/lib/govhub';
import type { HermesSession } from '@/lib/auth-session';

export type PatchMatch = {
  source: 'govhub' | 'canopi';
  externalId: string;
  href: string;
  snippet?: string;
  createdAt?: string;
};

const GOVHUB_DRAFT_REFS = [
  'ML-Draft-033',
  'ml-draft-033',
  'desirable-properties',
];

const CANOPI_PAGE_IDS = [
  'intro',
  'dp01',
  'dp02',
  'dp03',
  'dp04',
  'dp05',
  canopiPageIdFromUrl(`${DP_CANOPI_BOOK_ORIGIN}/viewer/intro`),
  canopiPageIdFromUrl('https://staging.desirableproperties.org/perspectives/a-fork-in-the-web'),
  canopiPageIdFromUrl('https://desirableproperties.org/perspectives/a-fork-in-the-web'),
];

function namesMatch(a: string, b: string) {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

async function findCanopiPatch(session: HermesSession, sinceIso: string | null): Promise<PatchMatch | null> {
  const sinceMs = sinceIso ? Date.parse(sinceIso) : 0;
  const userId = session.userId;
  const displayName = session.displayName || session.username || '';
  const email = session.email || '';

  for (const pageId of CANOPI_PAGE_IDS) {
    const batch = await searchCanopiPosts({ pageId, limit: 50 });
    if (!batch.ok) continue;
    for (const post of batch.posts) {
      const parsed = classifyDiscussPost({ body: post.content, tagType: post.tagType });
      if (parsed.kind !== 'patch' && parsed.kind !== 'insert') continue;

      const authorId = post.authorId ? String(post.authorId) : '';
      const authorName = post.authorName || '';
      const authorMatch =
        (authorId && authorId === userId) ||
        namesMatch(authorName, displayName) ||
        (email && authorName.toLowerCase().includes(email.split('@')[0].toLowerCase()));

      if (!authorMatch) continue;

      const createdMs = post.createdAt ? Date.parse(post.createdAt) : 0;
      if (sinceMs && createdMs && createdMs < sinceMs) continue;

      const snippet = (parsed.content || post.content).replace(/\s+/g, ' ').trim().slice(0, 120);
      return {
        source: 'canopi',
        externalId: post.id,
        href: `https://book.desirableproperties.org/viewer/${pageId === canopiPageIdFromUrl(`${DP_CANOPI_BOOK_ORIGIN}/viewer/intro`) ? 'intro' : pageId}#discuss`,
        snippet,
        createdAt: post.createdAt || undefined,
      };
    }
  }
  return null;
}

async function findGovHubPatch(session: HermesSession, sinceIso: string | null): Promise<PatchMatch | null> {
  const sinceMs = sinceIso ? Date.parse(sinceIso) : 0;
  const who = session.displayName || session.username || '';
  const userId = session.userId;

  const events = await fetchLayerActivityEvents({
    limit: 80,
    eventTypes: ['dp_proposal_submitted'],
  });

  for (const event of events) {
    const payload = event.payload ?? {};
    const actor = event.actor_display_name || String(payload.actor_name || '');
    const actorId = String(payload.user_id || payload.actor_id || '');
    const actorMatch =
      (actorId && actorId === userId) || namesMatch(actor, who);
    if (!actorMatch) continue;

    const createdMs = Date.parse(event.created_at || '');
    if (sinceMs && createdMs && createdMs < sinceMs) continue;

    const proposalId = String(payload.proposal_id || payload.id || event.id);
    const draftRef = String(payload.draft_ref || payload.ml_number || '');
    const href = draftRef
      ? govhubUrl(`/doc/draft/${encodeURIComponent(draftRef)}/read/`)
      : govhubUrl('/doc/all/?collection=desirable-properties');

    return {
      source: 'govhub',
      externalId: proposalId,
      href,
      snippet: String(payload.proposed_text || payload.rationale || 'Gov Hub patch').slice(0, 120),
      createdAt: event.created_at,
    };
  }

  for (const ref of GOVHUB_DRAFT_REFS) {
    const proposals = await fetchDraftProposals(ref);
    for (const p of proposals) {
      const author = p.author_name || '';
      if (!namesMatch(author, who)) continue;
      const createdMs = p.created_at ? Date.parse(p.created_at) : 0;
      if (sinceMs && createdMs && createdMs < sinceMs) continue;
      return {
        source: 'govhub',
        externalId: p.id,
        href: govhubUrl(`/doc/draft/${encodeURIComponent(ref)}/read/`),
        snippet: (p.proposed_text || p.rationale || '').replace(/\s+/g, ' ').trim().slice(0, 120),
        createdAt: p.created_at || undefined,
      };
    }
  }

  return null;
}

export async function verifyUserPatch(opts: {
  seriesId: string;
  session: HermesSession;
  pearl?: EventSeriesPearl | null;
}): Promise<{ pearl: EventSeriesPearl | null; match: PatchMatch | null }> {
  const pearl =
    opts.pearl ??
    (await getOrCreatePearl(opts.seriesId, opts.session.userId, opts.session.email ?? null));
  if (!pearl) return { pearl: null, match: null };

  await touchPatchCheck(pearl.id);
  const sinceIso = pearl.createdAt || null;

  const [canopi, govhub] = await Promise.all([
    findCanopiPatch(opts.session, sinceIso),
    findGovHubPatch(opts.session, sinceIso),
  ]);

  const match = canopi || govhub;
  if (match) {
    await applyPatchVerification(pearl.id, match);
  }

  const updated = await getOrCreatePearl(
    opts.seriesId,
    opts.session.userId,
    opts.session.email ?? null,
  );
  return { pearl: updated, match };
}
