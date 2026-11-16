/**
 * Who is acting, and with which workspace role. Server-side only; every write calls this.
 * participant: any signed-in site account. facilitator: granted per meeting by an administrator.
 * administrator: DP site admin (ONCHAIN_ADMIN_EMAILS or dp_admin_user). council / claude_service: reserved.
 * A Zoom display name is never an account: speakers are a separate table with no account link.
 */
import type pg from 'pg';
import { readSession } from '@/lib/auth-session';
import { isEmailAdmin } from '@/lib/dp-admin-auth';
import type { Role, Viewer } from '@/lib/listening/types';

export type ResolvedViewer = Viewer & { email: string | null };

export async function resolveViewer(pool: pg.Pool, meetingId: string): Promise<ResolvedViewer> {
  const session = await readSession();
  if (!session) return { userId: null, name: null, role: null, signedIn: false, email: null };
  const name = (session.displayName || session.username || 'Signed-in participant').trim().slice(0, 120);
  const email = session.email?.trim().toLowerCase() || null;
  let role: Role = 'participant';
  if (email && (await isEmailAdmin(email).catch(() => false))) {
    role = 'administrator';
  } else {
    const r = await pool.query('SELECT role FROM dp_listen_participant WHERE meeting_id = $1 AND user_id = $2', [
      meetingId,
      session.userId,
    ]);
    if (r.rows[0]?.role === 'facilitator') role = 'facilitator';
  }
  return { userId: session.userId, name, role, signedIn: true, email };
}

export const canFacilitate = (role: Role | null) => role === 'facilitator' || role === 'administrator';
export const isAdministrator = (role: Role | null) => role === 'administrator';
