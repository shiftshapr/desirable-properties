import { adminEmails } from '@/lib/dp-admin-auth';
import { ensureDpSchema } from '@/lib/dp-db';

export const PROTECTED_ADMIN_EMAIL = 'bridgitdao@gmail.com';

export type DpAdminUser = {
  email: string;
  addedAt: string;
  addedBy: string | null;
  protected: boolean;
  source: 'env' | 'db';
};

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

function rowToAdmin(row: { email: string; added_at: Date; added_by: string | null; protected: boolean }) {
  return {
    email: row.email,
    addedAt: new Date(row.added_at).toISOString(),
    addedBy: row.added_by,
    protected: Boolean(row.protected),
    source: 'db' as const,
  };
}

export async function listDbAdminEmails(): Promise<string[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query('SELECT email FROM dp_admin_user ORDER BY email ASC');
  return res.rows.map((r) => String(r.email));
}

export async function listAdmins(): Promise<DpAdminUser[]> {
  const envSet = new Set(adminEmails());
  const dbRows: DpAdminUser[] = [];
  const pool = await ensureDpSchema();
  if (pool) {
    const res = await pool.query('SELECT * FROM dp_admin_user ORDER BY email ASC');
    for (const row of res.rows) {
      dbRows.push(rowToAdmin(row));
      envSet.delete(normEmail(row.email));
    }
  }

  const envRows: DpAdminUser[] = [...envSet].sort().map((email) => ({
    email,
    addedAt: '',
    addedBy: null,
    protected: normEmail(email) === normEmail(PROTECTED_ADMIN_EMAIL),
    source: 'env' as const,
  }));

  return [...envRows, ...dbRows].sort((a, b) => a.email.localeCompare(b.email));
}

export async function addAdmin(email: string, addedBy: string) {
  const normalized = normEmail(email);
  if (!normalized.includes('@')) {
    return { ok: false as const, error: 'invalid_email', message: 'Invalid email address.' };
  }
  if (adminEmails().includes(normalized)) {
    return { ok: false as const, error: 'already_env_admin', skipped: true, email: normalized };
  }

  const pool = await ensureDpSchema();
  if (!pool) {
    return { ok: false as const, error: 'database_unavailable', message: 'Postgres is not configured.' };
  }

  await pool.query(
    `INSERT INTO dp_admin_user (email, added_by, protected)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [normalized, normEmail(addedBy), normalized === normEmail(PROTECTED_ADMIN_EMAIL)],
  );

  return { ok: true as const, email: normalized };
}

export async function removeAdmin(email: string) {
  const normalized = normEmail(email);
  if (normalized === normEmail(PROTECTED_ADMIN_EMAIL)) {
    return {
      ok: false as const,
      error: 'protected_admin',
      message: 'The protected root admin cannot be removed.',
    };
  }
  if (adminEmails().includes(normalized)) {
    return {
      ok: false as const,
      error: 'env_admin',
      message: 'Remove this admin from ONCHAIN_ADMIN_EMAILS in the server environment.',
    };
  }

  const pool = await ensureDpSchema();
  if (!pool) {
    return { ok: false as const, error: 'database_unavailable', message: 'Postgres is not configured.' };
  }

  const res = await pool.query('DELETE FROM dp_admin_user WHERE email = $1 RETURNING email', [normalized]);
  if (!res.rowCount) {
    return { ok: false as const, error: 'not_found', message: 'That email is not an admin.' };
  }
  return { ok: true as const, email: normalized };
}
