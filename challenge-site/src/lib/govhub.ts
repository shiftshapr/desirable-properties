/** Public Gov Hub URL (hub.themetalayer.org avoids networks that block "gov" in hostnames). */
export const GOVHUB_PUBLIC_BASE_URL =
  process.env.GOVHUB_BASE_URL ?? 'https://hub.themetalayer.org';
const GOVHUB_BASE = GOVHUB_PUBLIC_BASE_URL;

/** ML-Draft-026 – opening chapter framing the Desirable Properties Challenge */
export const FRAMING_CHAPTER_URL =
  `${GOVHUB_PUBLIC_BASE_URL}/doc/draft/z41gtb59/read/?return_to=%2Fdoc%2Fdraft%2Fz41gtb59%2F`;
export const FRAMING_CHAPTER_TITLE =
  'The Desirable Properties of a Meta-Layer';
export const FRAMING_CHAPTER_REF = 'ML-Draft-026';

/** Open-access BRC333 book reader (markdown ordinals).
 * Points at the cover page on the main domain so the in-header Book link
 * opens the cover; the cover click then routes into the viewer SPA at
 * /viewer/<chapter>. The legacy subdomain (book.desirableproperties.org)
 * still serves the BRC333 ordinal preview. */
export const DESIRABLE_PROPERTIES_BOOK_URL =
  'https://desirableproperties.org/book';
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

type LayerActivityResponse = {
  events?: Array<{
    id: string;
    event_type: string;
    actor_display_name?: string;
    created_at: string;
    payload?: Record<string, unknown>;
  }>;
};

type WorkgroupsResponse = {
  workgroups?: GovHubWorkgroup[];
};

async function fetchGovHub<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GOVHUB_BASE}${path}`, {
      next: { revalidate: 300 },
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

export function extractDpId(name: string): string | null {
  const match = name.match(/^DP(\d+)\b/i);
  return match ? `DP${match[1]}` : null;
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
    .filter((wg) => extractDpId(wg.name))
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
      const aNum = Number(extractDpId(a.name)?.replace('DP', '') ?? 0);
      const bNum = Number(extractDpId(b.name)?.replace('DP', '') ?? 0);
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

export function formatActivityDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
