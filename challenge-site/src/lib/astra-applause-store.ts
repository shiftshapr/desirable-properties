import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import {
  ASTRA_APPLAUSE_GLOBAL_WORKGROUP_ID,
  ASTRA_APPLAUSE_MAX_PER_USER,
  type AstraApplauseSnapshot,
} from '@/lib/astra-applause-constants';

export { ASTRA_APPLAUSE_MAX_PER_USER, type AstraApplauseSnapshot };

export function isAstraApplauseDbConfigured(): boolean {
  return isDpDatabaseConfigured();
}

let applauseMigrationReady: Promise<void> | null = null;

async function ensureAstraApplauseMigrated(): Promise<void> {
  const pool = await ensureDpSchema();
  if (!pool) return;

  if (!applauseMigrationReady) {
    applauseMigrationReady = (async () => {
      await pool.query(
        `INSERT INTO astra_change_applause (workgroup_id, change_id, user_id, count, updated_at)
         SELECT $1, change_id, user_id, LEAST($2, SUM(count)), MAX(updated_at)
         FROM astra_change_applause
         WHERE workgroup_id <> $1
         GROUP BY change_id, user_id
         ON CONFLICT (workgroup_id, change_id, user_id)
         DO UPDATE SET
           count = LEAST($2, astra_change_applause.count + EXCLUDED.count),
           updated_at = GREATEST(astra_change_applause.updated_at, EXCLUDED.updated_at)`,
        [ASTRA_APPLAUSE_GLOBAL_WORKGROUP_ID, ASTRA_APPLAUSE_MAX_PER_USER],
      );
    })();
  }

  await applauseMigrationReady;
}

export async function fetchAstraApplause(
  _workgroupId: string,
  changeIds: string[],
  userId: string | null,
): Promise<AstraApplauseSnapshot> {
  const ids = [...new Set(changeIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const empty: AstraApplauseSnapshot = { totals: {}, mine: {} };
  if (!ids.length) return empty;

  const pool = await ensureDpSchema();
  if (!pool) return empty;

  await ensureAstraApplauseMigrated();

  const totalsRes = await pool.query<{ change_id: string; total: string }>(
    `SELECT change_id, LEAST($2, COALESCE(SUM(count), 0))::text AS total
     FROM astra_change_applause
     WHERE change_id = ANY($1::text[])
     GROUP BY change_id`,
    [ids, ASTRA_APPLAUSE_MAX_PER_USER],
  );

  const totals: Record<string, number> = {};
  for (const id of ids) totals[id] = 0;
  for (const row of totalsRes.rows) {
    totals[row.change_id] = Number(row.total) || 0;
  }

  const mine: Record<string, number> = {};
  if (userId) {
    const mineRes = await pool.query<{ change_id: string; count: number }>(
      `SELECT change_id, LEAST($3, COALESCE(SUM(count), 0))::int AS count
       FROM astra_change_applause
       WHERE change_id = ANY($1::text[]) AND user_id = $2
       GROUP BY change_id`,
      [ids, userId, ASTRA_APPLAUSE_MAX_PER_USER],
    );
    for (const id of ids) mine[id] = 0;
    for (const row of mineRes.rows) {
      mine[row.change_id] = Number(row.count) || 0;
    }
  }

  return { totals, mine };
}

export type AstraApplauseIncrementResult =
  | { ok: true; total: number; mine: number }
  | { ok: false; reason: 'cap_reached' | 'invalid' | 'unavailable'; total?: number; mine?: number };

/** Increment applause for signed-in Gov Hub user (max 10 per change, not decrementable). */
export async function incrementAstraApplause(
  _workgroupId: string,
  changeId: string,
  userId: string,
): Promise<AstraApplauseIncrementResult> {
  const cId = String(changeId || '').trim();
  const uId = String(userId || '').trim();
  if (!cId || !uId) return { ok: false, reason: 'invalid' };

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false, reason: 'unavailable' };

  await ensureAstraApplauseMigrated();

  const snapshotBefore = await fetchAstraApplause(ASTRA_APPLAUSE_GLOBAL_WORKGROUP_ID, [cId], uId);
  const mineBefore = snapshotBefore.mine[cId] ?? 0;
  if (mineBefore >= ASTRA_APPLAUSE_MAX_PER_USER) {
    return {
      ok: false,
      reason: 'cap_reached',
      total: snapshotBefore.totals[cId] ?? 0,
      mine: mineBefore,
    };
  }

  await pool.query(
    `INSERT INTO astra_change_applause (workgroup_id, change_id, user_id, count, updated_at)
     VALUES ($1, $2, $3, 0, now())
     ON CONFLICT (workgroup_id, change_id, user_id) DO NOTHING`,
    [ASTRA_APPLAUSE_GLOBAL_WORKGROUP_ID, cId, uId],
  );

  const updateRes = await pool.query<{ count: number }>(
    `UPDATE astra_change_applause
     SET count = count + 1, updated_at = now()
     WHERE workgroup_id = $1 AND change_id = $2 AND user_id = $3 AND count < $4
     RETURNING count`,
    [ASTRA_APPLAUSE_GLOBAL_WORKGROUP_ID, cId, uId, ASTRA_APPLAUSE_MAX_PER_USER],
  );

  const snapshot = await fetchAstraApplause(ASTRA_APPLAUSE_GLOBAL_WORKGROUP_ID, [cId], uId);
  const total = snapshot.totals[cId] ?? 0;
  const mine = snapshot.mine[cId] ?? 0;

  if (!updateRes.rows[0]) {
    return { ok: false, reason: 'cap_reached', total, mine };
  }

  return { ok: true, total, mine };
}
