import 'server-only';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

/**
 * The book club's update list, as its Gov Hub pad publishes it (GET /api/pads/<layer>/<pad>/ → `waitlist`).
 * The pad's Join section on Gov Hub decides which waitlist it is, the button label, whether the popup shows and
 * where "Claim your profile" goes, so this page and the Gov Hub pad stay the same without a second setting.
 * Null when the pad names no waitlist, the list is not public, or Gov Hub is down: the page then shows no form.
 */
export type BookClubWaitlist = {
  id: string;
  name: string;
  description: string | null;
  open: boolean;
  closedNote: string | null;
  label: string | null;
  popup: { title: string | null; text: string | null } | null;
  profile: { url: string; label: string } | null;
  /** Gov Hub base URL the form posts to and the popup script loads from. */
  api: string;
};

export async function fetchBookClubWaitlist(layer: string, pad: string): Promise<BookClubWaitlist | null> {
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/pads/${encodeURIComponent(layer)}/${encodeURIComponent(pad)}/`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const w = ((await res.json()) as { waitlist?: Partial<BookClubWaitlist> | null }).waitlist;
    if (!w || typeof w.id !== 'string' || typeof w.name !== 'string') return null;
    const profile =
      w.profile && typeof w.profile.url === 'string' && /^https?:\/\//i.test(w.profile.url)
        ? { url: w.profile.url, label: w.profile.label || 'Claim your profile' }
        : null;
    return {
      id: w.id,
      name: w.name,
      description: w.description ?? null,
      open: w.open === true,
      closedNote: w.closedNote ?? null,
      label: w.label ?? null,
      popup: w.popup ? { title: w.popup.title ?? null, text: w.popup.text ?? null } : null,
      profile,
      api: GOVHUB_PUBLIC_BASE_URL,
    };
  } catch {
    return null;
  }
}
