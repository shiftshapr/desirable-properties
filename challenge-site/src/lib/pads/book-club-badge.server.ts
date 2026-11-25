/**
 * "Earn a badge" on /pads/book-club: the activities and the answers members chose to share come from the Gov Hub
 * pad (GET {GOVHUB}/api/pads/<layer>/<pad>/sections/badge/?o=<meeting>, public, no credentials). Members save their
 * answers on Gov Hub, where the pad and their own book club page live (handoff/specs/pad-builder.md §12).
 *
 * Returns null when Gov Hub has no such pad or does not answer in time (e.g. production before the Gov Hub release);
 * the page then shows its own copy of the activities without a save link.
 */
import 'server-only';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

export type BadgeActivity = { id: string; label: string; href?: string | null; note?: string | null; prompt?: string | null };
export type SharedAnswer = { name: string; body: string; linkUrl: string | null };

export type BookClubBadge = {
  title: string;
  intro: string | null;
  badgeName: string | null;
  feeNote: string | null;
  payUrl: string | null;
  payLabel: string | null;
  activities: BadgeActivity[];
  shared: Record<string, SharedAnswer[]>;
  /** The pad on Gov Hub, at this meeting's "Earn a badge" section: sign in there to save answers. */
  saveUrl: string;
  /** The member's own book club page on Gov Hub. */
  myPageUrl: string;
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);
const httpUrl = (v: unknown): string | null => {
  const s = str(v);
  return s && /^https?:\/\//i.test(s) ? s : null;
};

export async function fetchBookClubBadge(layer: string, pad: string, meetingId: string): Promise<BookClubBadge | null> {
  const base = GOVHUB_PUBLIC_BASE_URL.replace(/\/$/, '');
  const url = `${base}/api/pads/${encodeURIComponent(layer)}/${encodeURIComponent(pad)}/sections/badge/?o=${encodeURIComponent(meetingId)}`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000), next: { revalidate: 60 } });
    if (!r.ok) return null;
    const j = (await r.json()) as { section?: { title?: unknown; content?: Record<string, unknown> } };
    const c = j.section?.content;
    if (!c || !Array.isArray(c.activities)) return null;
    const activities = (c.activities as Record<string, unknown>[])
      .filter((a) => str(a.label) && str(a.id))
      .map((a) => ({ id: String(a.id), label: String(a.label), href: httpUrl(a.href), note: str(a.note), prompt: str(a.prompt) }));
    const shared: Record<string, SharedAnswer[]> = {};
    for (const [k, list] of Object.entries((c.shared as Record<string, unknown[]>) || {})) {
      shared[k] = (Array.isArray(list) ? list : [])
        .map((e) => e as Record<string, unknown>)
        .filter((e) => str(e.name) && (str(e.body) || httpUrl(e.linkUrl)))
        .map((e) => ({ name: String(e.name), body: str(e.body) ?? '', linkUrl: httpUrl(e.linkUrl) }));
    }
    const padUrl = `${base}/pads/${encodeURIComponent(layer)}/${encodeURIComponent(pad)}/`;
    return {
      title: str(j.section?.title) ?? 'Earn a badge',
      intro: str(c.intro),
      badgeName: str(c.badgeName),
      feeNote: str(c.feeNote),
      payUrl: httpUrl(c.payUrl),
      payLabel: str(c.payLabel),
      activities,
      shared,
      saveUrl: httpUrl(c.entriesUrl) ?? `${padUrl}?o=${encodeURIComponent(meetingId)}#badge`,
      myPageUrl: httpUrl(c.myPageUrl) ?? `${padUrl}me/`,
    };
  } catch {
    return null;
  }
}
