import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';
import {
  PARTICIPANT_EDIT_STATUSES,
  type ParticipantEditInput,
  type ParticipantEditKind,
  type ParticipantEditStatus,
  type ParticipantListing,
} from '@/lib/participant-edits';

export type ParticipantEditRow = {
  id: string;
  createdAt: string;
  slug: string;
  kind: ParticipantEditKind;
  current: ParticipantListing;
  proposed: ParticipantListing;
  photoNote: string;
  note: string;
  origin: string | null;
  status: ParticipantEditStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

/** At most this many submissions from one address in an hour, and this many from everyone in a day. */
const PER_ADDRESS_PER_HOUR = 20;
const ALL_PER_DAY = 400;

const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

function toRow(r: Record<string, unknown>): ParticipantEditRow {
  return {
    id: String(r.id),
    createdAt: iso(r.created_at) || '',
    slug: String(r.slug),
    kind: r.kind as ParticipantEditKind,
    current: r.current_listing as ParticipantListing,
    proposed: r.proposed_listing as ParticipantListing,
    photoNote: String(r.photo_note || ''),
    note: String(r.note || ''),
    origin: (r.origin as string) || null,
    status: r.status as ParticipantEditStatus,
    reviewedBy: (r.reviewed_by as string) || null,
    reviewedAt: iso(r.reviewed_at),
  };
}

/** The sender's address is kept only as a hash, to count submissions per address. */
export function participantEditAddressKey(ip: string): string {
  return crypto.createHash('sha256').update(`participant-edit:${ip || 'unknown'}`).digest('hex').slice(0, 32);
}

export async function createParticipantEdit(
  input: ParticipantEditInput,
  meta: { origin: string | null; addressKey: string },
): Promise<{ ok: true; id: string } | { ok: false; error: 'no_database' | 'too_many' }> {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false, error: 'no_database' };
  const counts = await pool.query(
    `SELECT count(*) FILTER (WHERE address_key = $1 AND created_at > now() - interval '1 hour') AS mine,
            count(*) FILTER (WHERE created_at > now() - interval '1 day') AS everyone
       FROM mli_participant_edit`,
    [meta.addressKey],
  );
  if (Number(counts.rows[0].mine) >= PER_ADDRESS_PER_HOUR || Number(counts.rows[0].everyone) >= ALL_PER_DAY) {
    return { ok: false, error: 'too_many' };
  }
  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO mli_participant_edit (id, slug, kind, current_listing, proposed_listing, photo_note, note, origin, address_key)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9)`,
    [
      id,
      input.slug,
      input.kind,
      JSON.stringify(input.current),
      JSON.stringify(input.proposed),
      input.photoNote,
      input.note,
      meta.origin,
      meta.addressKey,
    ],
  );
  return { ok: true, id };
}

export async function listParticipantEdits(status?: string): Promise<ParticipantEditRow[] | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const filter = (PARTICIPANT_EDIT_STATUSES as readonly string[]).includes(status || '') ? status : null;
  const res = await pool.query(
    `SELECT * FROM mli_participant_edit WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC LIMIT 500`,
    [filter],
  );
  return res.rows.map(toRow);
}

export async function setParticipantEditStatus(
  id: string,
  status: string,
  adminEmail: string,
): Promise<{ ok: true; edit: ParticipantEditRow } | { ok: false; error: 'no_database' | 'bad_status' | 'not_found' }> {
  if (!(PARTICIPANT_EDIT_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'bad_status' };
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false, error: 'no_database' };
  const res = await pool.query(
    `UPDATE mli_participant_edit
        SET status = $2,
            reviewed_by = CASE WHEN $2 = 'new' THEN NULL ELSE $3 END,
            reviewed_at = CASE WHEN $2 = 'new' THEN NULL ELSE now() END
      WHERE id = $1
      RETURNING *`,
    [id, status, adminEmail],
  );
  if (!res.rows.length) return { ok: false, error: 'not_found' };
  return { ok: true, edit: toRow(res.rows[0]) };
}
