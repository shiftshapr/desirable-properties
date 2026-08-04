/**
 * Bug Hunter – award public blueberry credit from support tickets (technical_support).
 * Simplified from metaweb-book: records award on ticket; no user progress tracking.
 */

import { ensureDpSchema } from '@/lib/dp-db';
import { pgPatchTicket, pgReadTicket } from '@/lib/dp-support-store';
import { supportDataDir } from '@/lib/support-store';
import type { SupportTicket } from '@/lib/support-store';

export const BUG_HUNTER_BLUEBERRY_ID = 'blueberry_bug_hunter';

export type BlueberryAward = {
  blueberryId: string;
  awardedAt: string;
  awardedBy: string;
};

const VALID_CATEGORIES = new Set(['technical_support']);

export async function awardSupportTicketBlueberry(opts: {
  ticketId: string;
  awardedBy: string;
  blueberryId?: string;
  category?: string;
}) {
  const dataDir = supportDataDir();
  const ticketId = String(opts.ticketId || '').trim();
  const ticket = await pgReadTicket(dataDir, ticketId);
  if (!ticket) return { ok: false as const, error: 'not_found', message: 'Ticket not found.' };
  if (!ticket.userId) {
    return { ok: false as const, error: 'ticket_missing_user', message: 'Ticket has no signed-in user id.' };
  }

  const category = String(opts.category || ticket.category || '').toLowerCase();
  if (!VALID_CATEGORIES.has(category)) {
    return {
      ok: false as const,
      error: 'category_mismatch',
      message: 'Bug Hunter blueberries apply to technical support tickets only.',
    };
  }

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const existing = await pool.query(
    'SELECT blueberry_award FROM dp_support_ticket WHERE id = $1',
    [ticketId],
  );
  const awardRaw = existing.rows[0]?.blueberry_award;
  if (awardRaw && typeof awardRaw === 'object' && (awardRaw as BlueberryAward).awardedAt) {
    return {
      ok: false as const,
      error: 'already_awarded',
      message: 'Bug Hunter blueberry already awarded for this ticket.',
    };
  }

  const now = new Date().toISOString();
  const award: BlueberryAward = {
    blueberryId: String(opts.blueberryId || BUG_HUNTER_BLUEBERRY_ID),
    awardedAt: now,
    awardedBy: String(opts.awardedBy || 'admin').slice(0, 80),
  };

  const patch = await pgPatchTicket(dataDir, ticketId, {
    note: {
      kind: 'system',
      text: `Bug Hunter blueberry awarded (${award.blueberryId}).`,
      author: award.awardedBy,
    },
  });
  if (!patch.ok) return patch;

  await pool.query(
    'UPDATE dp_support_ticket SET blueberry_award = $2::jsonb, updated_at = now() WHERE id = $1',
    [ticketId, JSON.stringify(award)],
  );

  const updated = await pgReadTicket(dataDir, ticketId);
  return {
    ok: true as const,
    awardedAt: now,
    userId: ticket.userId,
    ticket: updated,
  };
}

export async function getTicketBlueberryAward(ticketId: string): Promise<BlueberryAward | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT blueberry_award FROM dp_support_ticket WHERE id = $1', [ticketId]);
  const raw = res.rows[0]?.blueberry_award;
  if (!raw || typeof raw !== 'object') return null;
  const award = raw as BlueberryAward;
  return award.awardedAt ? award : null;
}
