import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';

export type AstraRevocationRecord = {
  changeId: string;
  revokedBy: string;
  revokedAt: string;
};

export type AstraRevocationSnapshot = {
  revoked: Record<string, AstraRevocationRecord>;
};

export function isAstraRevocationDbConfigured(): boolean {
  return isDpDatabaseConfigured();
}

export async function fetchAstraRevocations(
  workgroupId: string,
  changeIds: string[],
): Promise<AstraRevocationSnapshot> {
  const ids = [...new Set(changeIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const empty: AstraRevocationSnapshot = { revoked: {} };
  if (!ids.length) return empty;

  const pool = await ensureDpSchema();
  if (!pool) return empty;

  const res = await pool.query<{
    change_id: string;
    revoked_by: string;
    revoked_at: Date;
  }>(
    `SELECT change_id, revoked_by, revoked_at
     FROM astra_change_revocation
     WHERE workgroup_id = $1 AND change_id = ANY($2::text[])`,
    [workgroupId, ids],
  );

  const revoked: Record<string, AstraRevocationRecord> = {};
  for (const row of res.rows) {
    revoked[row.change_id] = {
      changeId: row.change_id,
      revokedBy: row.revoked_by,
      revokedAt: new Date(row.revoked_at).toISOString(),
    };
  }
  return { revoked };
}

export async function revokeAstraChange(
  workgroupId: string,
  changeId: string,
  userId: string,
): Promise<boolean> {
  const wgId = String(workgroupId || '').trim();
  const cId = String(changeId || '').trim();
  const uId = String(userId || '').trim();
  if (!wgId || !cId || !uId) return false;

  const pool = await ensureDpSchema();
  if (!pool) return false;

  await pool.query(
    `INSERT INTO astra_change_revocation (workgroup_id, change_id, revoked_by, revoked_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (workgroup_id, change_id)
     DO UPDATE SET revoked_by = EXCLUDED.revoked_by, revoked_at = now()`,
    [wgId, cId, uId],
  );
  return true;
}

export async function restoreAstraChange(
  workgroupId: string,
  changeId: string,
): Promise<boolean> {
  const wgId = String(workgroupId || '').trim();
  const cId = String(changeId || '').trim();
  if (!wgId || !cId) return false;

  const pool = await ensureDpSchema();
  if (!pool) return false;

  await pool.query(
    `DELETE FROM astra_change_revocation WHERE workgroup_id = $1 AND change_id = $2`,
    [wgId, cId],
  );
  return true;
}
