// Proposed edits to a listing on the Meta-Layer Initiative participants page (themetalayer.org/participants/<slug>/).
// The page is static; its form posts here and a site admin reviews the result in /admin?tab=participant-edits.
// Pure rules only (no database, no Next.js) so node --test can import this file.

export const PARTICIPANT_EDIT_KINDS = ['edit', 'approve', 'remove'] as const;
export type ParticipantEditKind = (typeof PARTICIPANT_EDIT_KINDS)[number];

export const PARTICIPANT_EDIT_STATUSES = ['new', 'applied', 'dismissed'] as const;
export type ParticipantEditStatus = (typeof PARTICIPANT_EDIT_STATUSES)[number];

/** The four text fields a listing shows, with the longest value each may hold. */
export const PARTICIPANT_FIELD_LIMITS = { name: 120, role: 160, headline: 400, description: 2500 } as const;
export type ParticipantField = keyof typeof PARTICIPANT_FIELD_LIMITS;
export const PARTICIPANT_FIELDS = Object.keys(PARTICIPANT_FIELD_LIMITS) as ParticipantField[];

export type ParticipantListing = Record<ParticipantField, string>;

export type ParticipantEditInput = {
  slug: string;
  kind: ParticipantEditKind;
  current: ParticipantListing;
  proposed: ParticipantListing;
  photoNote: string;
  note: string;
};

/** Sites whose pages may post a proposed edit from the browser. */
export const PARTICIPANT_EDIT_ORIGINS = new Set(['https://staging.themetalayer.org', 'https://themetalayer.org']);

const text = (value: unknown, max: number) =>
  String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .trim()
    .slice(0, max);

function listing(raw: unknown): ParticipantListing {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(PARTICIPANT_FIELDS.map((f) => [f, text(o[f], PARTICIPANT_FIELD_LIMITS[f])])) as ParticipantListing;
}

/** The fields whose proposed value differs from the current one. */
export function changedParticipantFields(current: ParticipantListing, proposed: ParticipantListing): ParticipantField[] {
  return PARTICIPANT_FIELDS.filter((f) => proposed[f] !== current[f]);
}

/**
 * Clean a submitted body. `website` is a hidden field people never see: a value there means a bot, which is told
 * "ok" by the route and stored nowhere.
 */
export function readParticipantEdit(
  body: unknown,
): { ok: true; value: ParticipantEditInput; bot: boolean } | { ok: false; error: string; message: string } {
  const o = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const slug = String(o.slug ?? '').trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) {
    return { ok: false, error: 'bad_slug', message: 'This page is missing its listing name.' };
  }
  const kind = String(o.kind ?? '') as ParticipantEditKind;
  if (!PARTICIPANT_EDIT_KINDS.includes(kind)) {
    return { ok: false, error: 'bad_kind', message: 'Choose what you would like to do.' };
  }
  const current = listing(o.current);
  if (!current.name) return { ok: false, error: 'no_current', message: 'This page is missing its current listing.' };
  const proposed = kind === 'edit' ? listing(o.proposed) : current;
  const photoNote = kind === 'edit' ? text(o.photoNote, 600) : '';
  const note = text(o.note, 2000);
  if (kind === 'edit') {
    if (!proposed.name) return { ok: false, error: 'no_name', message: 'Your name cannot be empty.' };
    if (!changedParticipantFields(current, proposed).length && !photoNote && !note) {
      return { ok: false, error: 'no_change', message: 'Change something, or add a note, before sending.' };
    }
  }
  return { ok: true, value: { slug, kind, current, proposed, photoNote, note }, bot: Boolean(String(o.website ?? '').trim()) };
}
