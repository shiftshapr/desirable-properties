/** Public Gov Hub URL (interfacehub.net is canonical; legacy hub host 301s). */
import { workgroupActivityHref } from '@/lib/workgroup-links';
import { WORKGROUPS_JOIN_HREF } from '@/lib/routes';

export const GOVHUB_PUBLIC_BASE_URL =
  process.env.GOVHUB_BASE_URL ?? 'https://interfacehub.net';
const GOVHUB_BASE = GOVHUB_PUBLIC_BASE_URL;

/** ML-Draft-033 – book cover rail for The Layered Web */
export const BOOK_COVER_REF = 'ML-Draft-033';
export const BOOK_COVER_URL =
  `${GOVHUB_PUBLIC_BASE_URL}/doc/draft/ML-Draft-033/read/`;

/** ML-Draft-026 – opening chapter framing the Desirable Properties Challenge */
export const FRAMING_CHAPTER_URL =
  `${GOVHUB_PUBLIC_BASE_URL}/doc/draft/z41gtb59/read/?return_to=%2Fdoc%2Fdraft%2Fz41gtb59%2F`;
export const FRAMING_CHAPTER_TITLE =
  'The Desirable Properties of a Meta-Layer';

/** Formal title of the Desirable Properties book (book.desirableproperties.org). */
export const DESIRABLE_PROPERTIES_BOOK_TITLE =
  'The Layered Web: The Desirable Properties of a Meta-Layer';
export const FRAMING_CHAPTER_REF = 'ML-Draft-026';

const PROD_BOOK_ORIGIN = 'https://book.desirableproperties.org';
const STAGING_BOOK_ORIGIN = 'https://staging.book.desirableproperties.org';

/** User-facing book host – staging challenge-site links to staging.book. */
function resolveBookOrigin(): string {
  const explicit = process.env.DP_BOOK_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    return window.location.hostname === 'staging.desirableproperties.org'
      ? STAGING_BOOK_ORIGIN
      : PROD_BOOK_ORIGIN;
  }
  const publicBase = process.env.DP_PUBLIC_BASE?.trim() || '';
  if (publicBase.includes('staging.desirableproperties.org')) {
    return STAGING_BOOK_ORIGIN;
  }
  return PROD_BOOK_ORIGIN;
}

export const DP_BOOK_ORIGIN = resolveBookOrigin();

export const DESIRABLE_PROPERTIES_BOOK_HOST = new URL(DP_BOOK_ORIGIN).hostname;

/** Open-access BRC333 book reader (markdown ordinals).
 * Points at the cover page on the challenge-site so the in-header Book link
 * opens the cover; the cover click then routes into the viewer SPA at
 * /viewer/<chapter>. */
export const DESIRABLE_PROPERTIES_BOOK_URL = `${(process.env.DP_PUBLIC_BASE?.trim() || 'https://desirableproperties.org').replace(/\/$/, '')}/book`;

/** Book launch RSVP – Sept 16, 2026 (estate-timeline.yaml → challenge-timeline.json). */
export const META_LAYER_SUMMIT_LUMA_URL = 'https://luma.com/wfi1z9lv';

/** Live book reader with chapter comments (Canopi) – discuss on each chapter today.
 * Passage-level patching on the book is coming; use Gov Hub to patch drafts now. */
export const DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL = `${DP_BOOK_ORIGIN}/`;

function withDiscussQuery(url: string, discuss?: boolean): string {
  if (!discuss) return url;
  return url.includes('?') ? `${url}&discuss=1` : `${url}?discuss=1`;
}

/** Book viewer URL for a DP chapter or Canopi page slug. */
export function bookViewerHref(opts?: {
  dpId?: string | null;
  pageId?: string | null;
  /** Append ?discuss=1 so the book bridge auto-opens Canopi Discuss. */
  discuss?: boolean;
}): string {
  const pageId = String(opts?.pageId || '').trim().toLowerCase();
  // Short chapter keys only (intro, dp01, …) – not Canopi hashed pageIds.
  if (pageId === 'intro' || /^dp\d{2}$/i.test(pageId)) {
    return withDiscussQuery(`${DP_BOOK_ORIGIN}/viewer/${pageId}`, opts?.discuss);
  }
  const dpId = String(opts?.dpId || '').trim();
  if (dpId) {
    const n = dpId.replace(/^DP/i, '').padStart(2, '0');
    return withDiscussQuery(`${DP_BOOK_ORIGIN}/viewer/dp${n}`, opts?.discuss);
  }
  return withDiscussQuery(DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL, opts?.discuss);
}

/** Book URL that opens the reader with Canopi Discuss sidebar auto-expanded. */
export function bookDiscussHref(opts?: {
  dpId?: string | null;
  pageId?: string | null;
}): string {
  return bookViewerHref({ ...opts, discuss: true });
}

function dpIdFromDraftRef(draftRef?: string | null): string | null {
  const raw = String(draftRef || '').trim();
  if (!raw) return null;
  const dp = raw.match(/\bDP\s*0*(\d{1,2})\b/i);
  if (dp) return `DP${Number(dp[1])}`;
  const ml = raw.match(/\bML[-\s]?0*(\d{1,2})\b/i);
  if (ml) return `DP${Number(ml[1])}`;
  return null;
}

/** Deep link into book Discuss — published post opens in focus mode. */
export function bookDiscussPostHref(opts: {
  messageId: string;
  draftRef?: string | null;
  dpId?: string | null;
  pageId?: string | null;
}): string {
  const base = bookDiscussHref({
    dpId: opts.dpId || dpIdFromDraftRef(opts.draftRef),
    pageId: opts.pageId,
  });
  const url = new URL(base);
  url.searchParams.set('canopiOpen', '1');
  url.searchParams.set('canopiMsg', opts.messageId);
  if (opts.pageId) url.searchParams.set('canopiPageId', opts.pageId);
  return url.href;
}

/** Deep link into book Discuss — draft opens in UnifiedMessageModal. */
export function bookDiscussDraftHref(opts: {
  draftId: string;
  draftRef?: string | null;
  dpId?: string | null;
  pageId?: string | null;
}): string {
  const base = bookDiscussHref({
    dpId: opts.dpId || dpIdFromDraftRef(opts.draftRef),
    pageId: opts.pageId,
  });
  const url = new URL(base);
  url.searchParams.set('canopiOpen', '1');
  url.searchParams.set('canopiDraft', opts.draftId);
  if (opts.pageId) url.searchParams.set('canopiPageId', opts.pageId);
  return url.href;
}

/** Intro chapter of The Layered Web with Canopi Discuss auto-opened. */
export function bookIntroDiscussHref(): string {
  return bookDiscussHref({ pageId: 'intro' });
}

const METAWEB_LAYER_ID =
  process.env.GOVHUB_METAWEB_LAYER_ID ?? '22d90c89-2783-4726-a8b6-220dca505402';

const CHALLENGE_ACTIVITY_TYPES = new Set([
  'dp_proposal_submitted',
  'dp_proposal_accepted',
  'dp_proposal_declined',
  'draft_created',
  'draft_revision_approved',
  'draft_published_as_rfc',
  'draft_comment_added',
  'vote_started',
  'vote_closed',
  'member_joined',
  'workgroup_message_posted',
  'workgroup_invite_sent',
  'workgroup_invite_accepted',
  'workgroup_member_joined',
  'workgroup_member_left',
]);

export type GovHubWorkgroup = {
  id: string;
  name: string;
  slug: string;
  status: string;
  state: string;
  description: string;
  document_href: string | null;
  document_label: string | null;
  document_draft_ref: string | null;
};

export type ChallengeActivityItem = {
  id: string;
  createdAt: string;
  text: string;
  href: string;
};

export type LayerActivityEvent = {
  id: string;
  event_type: string;
  actor_display_name?: string;
  created_at: string;
  payload?: Record<string, unknown>;
  subject_type?: string | null;
  subject_id?: string | null;
};

type LayerActivityResponse = {
  events?: LayerActivityEvent[];
};

export type GovHubDraftProposal = {
  id: string;
  status: string;
  status_label?: string | null;
  patch_mode?: string | null;
  original_text?: string | null;
  proposed_text?: string | null;
  author_name?: string | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  rationale?: string | null;
  submission_id?: string | null;
};

type WorkgroupsResponse = {
  workgroups?: GovHubWorkgroup[];
};

async function fetchGovHub<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GOVHUB_BASE}${path}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function govhubUrl(path: string): string {
  if (!path) return GOVHUB_BASE;
  return `${GOVHUB_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Gov Hub document list filtered to Desirable Properties drafts (patch entry point). */
export const GOVHUB_DP_PATCHES_URL = govhubUrl('/doc/all/?collection=desirable-properties');

/** ML-Draft read view for a workgroup-linked draft (patch entry point). */
export function govhubDraftReadHref(documentHref: string | null | undefined): string | null {
  const href = String(documentHref || '').trim();
  if (!href) return null;
  const base = govhubUrl(href);
  return base.endsWith('/') ? `${base}read/` : `${base}/read/`;
}

/** Meta workgroup that tracks gaps across the numbered DP set (not itself a DP#). */
export const DP_DISCOVERY_SLUG = 'dp-discovery';

/** Discovery-only “What we ask of you” copy (welcome + getting started). */
export const DP_DISCOVERY_ASK_ITEMS = [
  'Review the Layered Web book (book.desirableproperties.org).',
  'Review for context and completeness.',
  'Discuss on the book – chapter comments are live now (Canopi on each chapter).',
  'Participate in workgroup discussion about where a new concept fits in the existing DPs and/or new DPs that may be needed.',
] as const;

export function isDpDiscoveryWorkgroup(slug?: string | null): boolean {
  return String(slug || '').trim().toLowerCase() === DP_DISCOVERY_SLUG;
}

export function extractDpId(name: string): string | null {
  const match = name.match(/^DP(\d+)\b/i);
  return match ? `DP${match[1]}` : null;
}

/** Numbered DP workgroups plus the shared DP Discovery workgroup. */
export function isDpChallengeWorkgroup(wg: {
  name?: string | null;
  slug?: string | null;
  acronym?: string | null;
}): boolean {
  const slug = String(wg.slug || wg.acronym || '')
    .trim()
    .toLowerCase();
  if (slug === DP_DISCOVERY_SLUG) return true;
  return Boolean(extractDpId(String(wg.name || '')));
}

function draftHref(payload: Record<string, unknown>): string {
  const ref =
    (payload.ml_number as string) ||
    (payload.draft_name as string) ||
    (payload.submission_id as string) ||
    '';
  if (!ref) return '/doc/all/';
  return `/doc/draft/${ref}/`;
}

function formatActivityEvent(
  event: NonNullable<LayerActivityResponse['events']>[number],
): ChallengeActivityItem | null {
  const type = event.event_type;
  if (!CHALLENGE_ACTIVITY_TYPES.has(type)) return null;

  const who = event.actor_display_name?.trim() || 'A participant';
  const payload = event.payload ?? {};
  const docHref = draftHref(payload);
  const docLabel =
    (payload.ml_number as string) ||
    (payload.draft_name as string) ||
    'a draft';

  let text = '';
  let href = docHref;

  switch (type) {
    case 'dp_proposal_submitted':
      text = `${who} submitted a DP proposal on ${docLabel}`;
      break;
    case 'dp_proposal_accepted':
      text = `${who} accepted a DP proposal on ${docLabel}`;
      break;
    case 'dp_proposal_declined':
      text = `${who} declined a DP proposal on ${docLabel}`;
      break;
    case 'draft_created':
      text = `${who} created draft ${docLabel}`;
      break;
    case 'draft_revision_approved': {
      const rev = payload.revision_number as string | undefined;
      text = rev
        ? `${who} approved revision ${rev} of ${docLabel}`
        : `${who} approved a revision of ${docLabel}`;
      break;
    }
    case 'draft_published_as_rfc': {
      const rfc = payload.rfc_number as string | undefined;
      text = rfc
        ? `${docLabel} was published as RFC ${rfc}`
        : `${docLabel} was published as an RFC`;
      break;
    }
    case 'draft_comment_added':
      text = `${who} commented on ${docLabel}`;
      break;
    case 'vote_started':
      text = `A governance vote started: ${(payload.title as string) || 'Vote'}`;
      href = '/layers/the-metaweb/#votes';
      break;
    case 'vote_closed':
      text = `A governance vote closed on The Metaweb layer`;
      href = '/layers/the-metaweb/#votes';
      break;
    case 'member_joined':
      text = `${who} joined The Metaweb layer`;
      href = '/layers/the-metaweb/';
      break;
    case 'workgroup_message_posted': {
      const wgName = (payload.workgroup_name as string) || 'a workgroup';
      const slug = (payload.workgroup_slug as string) || '';
      text = `${who} posted in ${wgName}`;
      return {
        id: event.id,
        createdAt: event.created_at,
        text,
        href: slug ? workgroupActivityHref(slug) : WORKGROUPS_JOIN_HREF,
      };
    }
    case 'workgroup_invite_sent': {
      const wgName = (payload.workgroup_name as string) || 'a workgroup';
      const slug = (payload.workgroup_slug as string) || '';
      text = `${who} invited someone to ${wgName}`;
      return {
        id: event.id,
        createdAt: event.created_at,
        text,
        href: slug ? workgroupActivityHref(slug) : WORKGROUPS_JOIN_HREF,
      };
    }
    case 'workgroup_invite_accepted': {
      const wgName = (payload.workgroup_name as string) || 'a workgroup';
      const slug = (payload.workgroup_slug as string) || '';
      text = `${who} accepted an invitation to ${wgName}`;
      return {
        id: event.id,
        createdAt: event.created_at,
        text,
        href: slug ? workgroupActivityHref(slug) : WORKGROUPS_JOIN_HREF,
      };
    }
    case 'workgroup_member_joined': {
      const wgName =
        (payload.name as string) ||
        (payload.workgroup_name as string) ||
        'a workgroup';
      const slug =
        (payload.slug as string) || (payload.workgroup_slug as string) || '';
      const actor =
        (payload.display_name as string) || who;
      text = `${actor} joined ${wgName}`;
      return {
        id: event.id,
        createdAt: event.created_at,
        text,
        href: slug ? workgroupActivityHref(slug) : WORKGROUPS_JOIN_HREF,
      };
    }
    case 'workgroup_member_left': {
      const wgName =
        (payload.name as string) ||
        (payload.workgroup_name as string) ||
        'a workgroup';
      const slug =
        (payload.slug as string) || (payload.workgroup_slug as string) || '';
      const actor =
        (payload.display_name as string) || who;
      text = `${actor} left ${wgName}`;
      return {
        id: event.id,
        createdAt: event.created_at,
        text,
        href: slug ? workgroupActivityHref(slug) : WORKGROUPS_JOIN_HREF,
      };
    }
    default:
      return null;
  }

  return {
    id: event.id,
    createdAt: event.created_at,
    text,
    href: govhubUrl(href),
  };
}

export async function fetchChallengeWorkgroups(): Promise<GovHubWorkgroup[]> {
  const data = await fetchGovHub<WorkgroupsResponse>(
    `/api/layers/${METAWEB_LAYER_ID}/workgroups/`,
  );
  const workgroups = data?.workgroups ?? [];
  return workgroups
    .filter((wg) => isDpChallengeWorkgroup(wg))
    .map((wg) => ({
      id: wg.id,
      name: wg.name,
      slug: wg.slug,
      status: wg.status,
      state: wg.state,
      description: wg.description,
      document_href: wg.document_href,
      document_label: wg.document_label,
      document_draft_ref:
        (wg as unknown as { document_draft_ref?: string | null }).document_draft_ref ?? null,
    }))
    .sort((a, b) => {
      const aNum = Number(extractDpId(a.name)?.replace('DP', '') ?? 999);
      const bNum = Number(extractDpId(b.name)?.replace('DP', '') ?? 999);
      return aNum - bNum;
    });
}

export async function fetchChallengeActivity(
  limit = 12,
): Promise<ChallengeActivityItem[]> {
  const data = await fetchGovHub<LayerActivityResponse>(
    `/api/layers/${METAWEB_LAYER_ID}/activity/?limit=${limit * 3}`,
  );
  const events = data?.events ?? [];
  const items: ChallengeActivityItem[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    const item = formatActivityEvent(event);
    if (!item) continue;
    if (seen.has(item.text)) continue;
    seen.add(item.text);
    items.push(item);
    if (items.length >= limit) break;
  }

  return items;
}

/** Raw layer EventLog rows (optional event_type filter via repeated query params). */
export async function fetchLayerActivityEvents(opts?: {
  limit?: number;
  eventTypes?: string[];
}): Promise<LayerActivityEvent[]> {
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 50));
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  for (const t of opts?.eventTypes || []) {
    if (t) params.append('event_type', t);
  }
  const data = await fetchGovHub<LayerActivityResponse>(
    `/api/layers/${METAWEB_LAYER_ID}/activity/?${params.toString()}`,
  );
  return data?.events ?? [];
}

export async function fetchDraftProposals(
  draftRef: string,
): Promise<GovHubDraftProposal[]> {
  const ref = String(draftRef || '').trim();
  if (!ref) return [];
  const data = await fetchGovHub<{ proposals?: GovHubDraftProposal[] }>(
    `/api/doc/draft/${encodeURIComponent(ref)}/proposals/`,
  );
  return data?.proposals ?? [];
}

export function formatActivityEventPublic(
  event: LayerActivityEvent,
): ChallengeActivityItem | null {
  return formatActivityEvent(event);
}

/** True when a layer event payload refers to this workgroup and/or its draft. */
export function eventMatchesWorkgroup(
  event: LayerActivityEvent,
  opts: {
    workgroupId?: string | null;
    workgroupSlug?: string | null;
    draftRefs?: string[];
  },
): boolean {
  const payload = event.payload ?? {};
  const wgId = (opts.workgroupId || '').trim();
  const wgSlug = (opts.workgroupSlug || '').trim().toLowerCase();
  const draftRefs = new Set(
    (opts.draftRefs || []).map((r) => r.trim().toLowerCase()).filter(Boolean),
  );

  const payloadWgId = String(payload.workgroup_id || '').trim();
  const payloadSlug = String(
    payload.workgroup_slug || payload.slug || payload.acronym || '',
  )
    .trim()
    .toLowerCase();

  if (wgId && payloadWgId && payloadWgId === wgId) return true;
  if (wgSlug && payloadSlug && payloadSlug === wgSlug) return true;

  if (draftRefs.size) {
    const candidates = [
      payload.draft_name,
      payload.ml_number,
      payload.submission_id,
      payload.draft_ref,
    ]
      .map((v) => String(v || '').trim().toLowerCase())
      .filter(Boolean);
    if (candidates.some((c) => draftRefs.has(c))) return true;
  }

  return false;
}

import { formatUserDate } from '@/lib/format-user-datetime';

export function formatActivityDate(iso: string): string {
  return formatUserDate(iso, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
