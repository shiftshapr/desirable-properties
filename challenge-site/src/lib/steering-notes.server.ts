/**
 * Steering committee notes: a chat only the three steering members can read and post to, shown on
 * /steering and on each /steering/<ml> page. Gov Hub decides who is on the committee
 * (/api/workgroups/dp-steering/, viewer_is_steering); notes live in the DP site database
 * (dp_steering_note). A note keeps the document it was written from. Authors may remove their own
 * notes (soft delete).
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { ensureDpSchema } from '@/lib/dp-db';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

export const MAX_NOTE = 4000;
const PAGE = 200;

export type SteeringNote = {
  id: string;
  createdAt: string;
  userId: string;
  userName: string;
  mlNumber: string | null;
  body: string;
  mine: boolean;
};

/** Is the viewer (by their Gov Hub token) on the steering committee? */
export async function viewerIsSteering(idToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/dp-steering/`, {
      cache: 'no-store',
      headers: { Accept: 'application/json', Authorization: `Bearer ${idToken}` },
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => ({}))) as { viewer_is_steering?: boolean };
    return Boolean(data.viewer_is_steering);
  } catch {
    return false;
  }
}

function rowToNote(r: Record<string, unknown>, viewerId: string): SteeringNote {
  return {
    id: String(r.id),
    createdAt: new Date(r.created_at as string).toISOString(),
    userId: String(r.user_id),
    userName: String(r.user_name || 'Steering member'),
    mlNumber: (r.ml_number as string | null) ?? null,
    body: String(r.body),
    mine: String(r.user_id) === viewerId,
  };
}

/** The latest notes, oldest first. */
export async function listSteeringNotes(viewerId: string): Promise<SteeringNote[]> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('The site database is not configured.');
  const res = await pool.query(
    `SELECT id, created_at, user_id, user_name, ml_number, body FROM dp_steering_note
     WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ${PAGE}`,
  );
  return res.rows.reverse().map((r) => rowToNote(r, viewerId));
}

export async function postSteeringNote(opts: {
  userId: string;
  userName: string;
  mlNumber: string | null;
  body: string;
}): Promise<SteeringNote> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('The site database is not configured.');
  const id = randomUUID();
  const res = await pool.query(
    `INSERT INTO dp_steering_note (id, user_id, user_name, ml_number, body) VALUES ($1,$2,$3,$4,$5)
     RETURNING id, created_at, user_id, user_name, ml_number, body`,
    [id, opts.userId, opts.userName.slice(0, 200), opts.mlNumber, opts.body],
  );
  return rowToNote(res.rows[0], opts.userId);
}

/** Remove one of your own notes (soft delete). False when it is not yours or already gone. */
export async function removeSteeringNote(id: string, userId: string): Promise<boolean> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('The site database is not configured.');
  const res = await pool.query(
    `UPDATE dp_steering_note SET deleted_at = now() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
    [id, userId],
  );
  return (res.rowCount ?? 0) > 0;
}
