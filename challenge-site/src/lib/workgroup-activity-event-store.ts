import { randomUUID } from 'crypto';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';

export type WorkgroupActivityEventType =
  | 'member_chapter_edit'
  | 'member_chapter_edit_revoked'
  | 'member_chapter_edit_restored'
  | 'astra_patch_revoked'
  | 'astra_patch_restored'
  | 'download';

export type WorkgroupActivityEvent = {
  id: string;
  workgroupId: string;
  dpKey: string | null;
  eventType: WorkgroupActivityEventType;
  actorUserId: string | null;
  actorName: string | null;
  summary: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

type EventRow = {
  id: string;
  workgroup_id: string;
  dp_key: string | null;
  event_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  summary: string;
  detail_json: Record<string, unknown> | null;
  created_at: Date;
};

function mapRow(row: EventRow): WorkgroupActivityEvent {
  return {
    id: row.id,
    workgroupId: row.workgroup_id,
    dpKey: row.dp_key,
    eventType: row.event_type as WorkgroupActivityEventType,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    summary: row.summary,
    detail: row.detail_json || {},
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function isWorkgroupActivityEventDbConfigured(): boolean {
  return isDpDatabaseConfigured();
}

export async function recordWorkgroupActivityEvent(input: {
  workgroupId: string;
  dpKey?: string | null;
  eventType: WorkgroupActivityEventType;
  actorUserId?: string | null;
  actorName?: string | null;
  summary: string;
  detail?: Record<string, unknown>;
  id?: string;
}): Promise<WorkgroupActivityEvent | null> {
  const wgId = String(input.workgroupId || '').trim();
  const summary = String(input.summary || '').trim();
  if (!wgId || !summary) return null;

  const pool = await ensureDpSchema();
  if (!pool) return null;

  const id = String(input.id || randomUUID());
  const dpKey = input.dpKey ? String(input.dpKey).trim().toLowerCase() : null;

  const res = await pool.query<EventRow>(
    `INSERT INTO workgroup_activity_event (
       id, workgroup_id, dp_key, event_type, actor_user_id, actor_name, summary, detail_json, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now())
     ON CONFLICT (id) DO NOTHING
     RETURNING id, workgroup_id, dp_key, event_type, actor_user_id, actor_name, summary, detail_json, created_at`,
    [
      id,
      wgId,
      dpKey,
      input.eventType,
      input.actorUserId ? String(input.actorUserId) : null,
      input.actorName ? String(input.actorName) : null,
      summary,
      JSON.stringify(input.detail || {}),
    ],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function fetchWorkgroupActivityEvents(
  workgroupId: string,
  opts?: { dpKey?: string | null; limit?: number },
): Promise<WorkgroupActivityEvent[]> {
  const wgId = String(workgroupId || '').trim();
  if (!wgId) return [];

  const pool = await ensureDpSchema();
  if (!pool) return [];

  const limit = Math.min(50, Math.max(1, opts?.limit ?? 30));
  const dpKey = opts?.dpKey ? String(opts.dpKey).trim().toLowerCase() : null;

  const res = dpKey
    ? await pool.query<EventRow>(
        `SELECT id, workgroup_id, dp_key, event_type, actor_user_id, actor_name, summary, detail_json, created_at
         FROM workgroup_activity_event
         WHERE workgroup_id = $1 AND (dp_key IS NULL OR dp_key = $2)
         ORDER BY created_at DESC
         LIMIT $3`,
        [wgId, dpKey, limit],
      )
    : await pool.query<EventRow>(
        `SELECT id, workgroup_id, dp_key, event_type, actor_user_id, actor_name, summary, detail_json, created_at
         FROM workgroup_activity_event
         WHERE workgroup_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [wgId, limit],
      );

  return res.rows.map(mapRow);
}
