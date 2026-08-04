import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';
import { isCanopiUserId } from '@/lib/dp-canopi-user';

export type BroadcastPreference = {
  userId: string;
  email: string | null;
  doNotSend: boolean;
  unsubscribeToken: string | null;
  unsubscribedAt: string | null;
  updatedAt: string;
  createdAt: string;
};

function normEmail(email: unknown) {
  return String(email || '').trim().toLowerCase();
}

function rowToPref(row: Record<string, unknown>): BroadcastPreference {
  return {
    userId: String(row.user_id),
    email: row.email ? String(row.email) : null,
    doNotSend: Boolean(row.do_not_send),
    unsubscribeToken: row.unsubscribe_token ? String(row.unsubscribe_token) : null,
    unsubscribedAt: row.unsubscribed_at ? new Date(String(row.unsubscribed_at)).toISOString() : null,
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function getBroadcastPreference(userId: string, email?: string | null) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const id = String(userId || '').trim();
  if (!isCanopiUserId(id)) return { ok: false as const, error: 'invalid_user_id' };

  const existing = await pool.query('SELECT * FROM dp_broadcast_preference WHERE user_id = $1', [id]);
  if (existing.rows[0]) {
    const pref = rowToPref(existing.rows[0]);
    if (email && !pref.email) {
      await pool.query(
        'UPDATE dp_broadcast_preference SET email = $2, updated_at = now() WHERE user_id = $1',
        [id, normEmail(email)],
      );
      pref.email = normEmail(email) || pref.email;
    }
    return { ok: true as const, preference: pref };
  }

  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO dp_broadcast_preference (user_id, email, do_not_send, created_at, updated_at)
     VALUES ($1, $2, false, $3, $3)`,
    [id, normEmail(email) || null, now],
  );
  return {
    ok: true as const,
    preference: {
      userId: id,
      email: normEmail(email) || null,
      doNotSend: false,
      unsubscribeToken: null,
      unsubscribedAt: null,
      updatedAt: now,
      createdAt: now,
    },
  };
}

export async function setDoNotSendBroadcast(
  userId: string,
  doNotSend: boolean,
  opts: { email?: string | null; viaUnsubscribe?: boolean } = {},
) {
  const got = await getBroadcastPreference(userId, opts.email);
  if (!got.ok) return got;
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const unsubscribedAt = doNotSend && opts.viaUnsubscribe ? new Date().toISOString() : doNotSend ? got.preference.unsubscribedAt : null;
  await pool.query(
    `UPDATE dp_broadcast_preference SET
       do_not_send = $2,
       email = COALESCE($3, email),
       unsubscribed_at = $4,
       updated_at = now()
     WHERE user_id = $1`,
    [userId, Boolean(doNotSend), opts.email ? normEmail(opts.email) : null, unsubscribedAt],
  );
  return getBroadcastPreference(userId, opts.email);
}

export async function ensureUnsubscribeToken(userId: string, email?: string | null) {
  const got = await getBroadcastPreference(userId, email);
  if (!got.ok) return got;
  if (got.preference.unsubscribeToken) {
    return { ok: true as const, token: got.preference.unsubscribeToken, preference: got.preference };
  }

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const token = crypto.randomBytes(24).toString('hex');
  await pool.query(
    'UPDATE dp_broadcast_preference SET unsubscribe_token = $2, updated_at = now() WHERE user_id = $1',
    [userId, token],
  );
  await indexUnsubscribeToken({ token, userId, email: got.preference.email || email || null });
  return { ok: true as const, token, preference: { ...got.preference, unsubscribeToken: token } };
}

export async function indexUnsubscribeToken(opts: {
  token: string;
  userId?: string | null;
  email?: string | null;
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const token = String(opts.token || '').trim();
  if (!token) return { ok: false as const, error: 'missing_token' };
  await pool.query(
    `INSERT INTO dp_broadcast_unsubscribe (token, user_id, email, created_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, email = EXCLUDED.email`,
    [token, opts.userId || null, opts.email ? normEmail(opts.email) : null],
  );
  return { ok: true as const, token };
}

export async function lookupUnsubscribeToken(token: string) {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const t = String(token || '').trim();
  if (!t) return null;

  const byPref = await pool.query(
    'SELECT * FROM dp_broadcast_preference WHERE unsubscribe_token = $1 LIMIT 1',
    [t],
  );
  if (byPref.rows[0]) return rowToPref(byPref.rows[0]);

  const byIndex = await pool.query('SELECT * FROM dp_broadcast_unsubscribe WHERE token = $1 LIMIT 1', [t]);
  if (!byIndex.rows[0]) return null;
  const row = byIndex.rows[0];
  return {
    userId: row.user_id ? String(row.user_id) : '',
    email: row.email ? String(row.email) : null,
    doNotSend: false,
    unsubscribeToken: t,
    unsubscribedAt: null,
    updatedAt: new Date(String(row.created_at)).toISOString(),
    createdAt: new Date(String(row.created_at)).toISOString(),
  } satisfies BroadcastPreference;
}

export async function findByUnsubscribeToken(token: string) {
  return lookupUnsubscribeToken(token);
}

export async function isUserOptedOut(userId: string | null | undefined) {
  if (!userId || !isCanopiUserId(userId)) return false;
  const pool = await ensureDpSchema();
  if (!pool) return false;
  const res = await pool.query(
    'SELECT do_not_send FROM dp_broadcast_preference WHERE user_id = $1',
    [userId],
  );
  return Boolean(res.rows[0]?.do_not_send);
}
