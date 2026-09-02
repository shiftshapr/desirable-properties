import crypto from 'crypto';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import {
  DEFAULT_HERMES_WORKGROUP_SETTINGS,
  type HermesAmbientMode,
  type HermesDevilsAdvocatePolicy,
  type HermesHand,
  type HermesHandStatus,
  type HermesWorkgroupSettings,
} from '@/lib/hermes-ambient-types';

const VALID_MODES = new Set<HermesAmbientMode>(['observer', 'facilitator', 'devils_advocate']);
const VALID_STATUS = new Set<HermesHandStatus>(['raised', 'opened', 'shared', 'dismissed']);

function rowToSettings(row: Record<string, unknown>): HermesWorkgroupSettings {
  const modes = Array.isArray(row.allowed_modes)
    ? (row.allowed_modes as string[]).filter((m): m is HermesAmbientMode =>
        VALID_MODES.has(m as HermesAmbientMode),
      )
    : DEFAULT_HERMES_WORKGROUP_SETTINGS.allowedModes;

  return {
    workgroupId: String(row.workgroup_id),
    confidenceThreshold: Number(row.confidence_threshold) || 0.8,
    allowedModes: modes.length ? modes : DEFAULT_HERMES_WORKGROUP_SETTINGS.allowedModes,
    cooldownMinutes: Number(row.cooldown_minutes) || 15,
    devilsAdvocateMode: (String(row.devils_advocate_mode || 'request_only') === 'facilitator_enabled'
      ? 'facilitator_enabled'
      : 'request_only') as HermesDevilsAdvocatePolicy,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
  };
}

function rowToHand(row: Record<string, unknown>): HermesHand {
  const mode = String(row.mode || 'observer') as HermesAmbientMode;
  return {
    id: String(row.id),
    workgroupId: row.workgroup_id ? String(row.workgroup_id) : '',
    communityThreadId: row.community_thread_id ? String(row.community_thread_id) : null,
    triggerMessageId: String(row.trigger_message_id),
    triggerMessageBody: String(row.trigger_message_body || ''),
    triggerAuthorUserId: String(row.trigger_author_user_id),
    mode: VALID_MODES.has(mode) ? mode : 'observer',
    status: (VALID_STATUS.has(String(row.status) as HermesHandStatus)
      ? String(row.status)
      : 'raised') as HermesHandStatus,
    confidence: Number(row.confidence) || 0,
    teaser: String(row.teaser || ''),
    fullReply: row.full_reply ? String(row.full_reply) : null,
    requestedExplicitly: Boolean(row.requested_explicitly),
    visibility: row.visibility === 'shared' ? 'shared' : 'private',
    ownerUserId: String(row.owner_user_id),
    sharedMessageId: row.shared_message_id ? String(row.shared_message_id) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    openedAt: row.opened_at ? new Date(String(row.opened_at)).toISOString() : null,
    sharedAt: row.shared_at ? new Date(String(row.shared_at)).toISOString() : null,
    dismissedAt: row.dismissed_at ? new Date(String(row.dismissed_at)).toISOString() : null,
  };
}

export function isHermesAmbientDbConfigured(): boolean {
  return isDpDatabaseConfigured();
}

export async function getWorkgroupHermesSettings(
  workgroupId: string,
): Promise<HermesWorkgroupSettings> {
  const pool = await ensureDpSchema();
  if (!pool) {
    return {
      workgroupId,
      ...DEFAULT_HERMES_WORKGROUP_SETTINGS,
      updatedAt: null,
      updatedBy: null,
    };
  }

  const res = await pool.query(
    'SELECT * FROM dp_hermes_workgroup_settings WHERE workgroup_id = $1',
    [workgroupId],
  );
  if (!res.rows[0]) {
    return {
      workgroupId,
      ...DEFAULT_HERMES_WORKGROUP_SETTINGS,
      updatedAt: null,
      updatedBy: null,
    };
  }
  return rowToSettings(res.rows[0]);
}

export async function updateWorkgroupHermesSettings(
  workgroupId: string,
  patch: Partial<{
    confidenceThreshold: number;
    allowedModes: HermesAmbientMode[];
    cooldownMinutes: number;
    devilsAdvocateMode: HermesDevilsAdvocatePolicy;
  }>,
  updatedBy: string,
): Promise<HermesWorkgroupSettings> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('Database not configured');

  const current = await getWorkgroupHermesSettings(workgroupId);
  const next = {
    confidenceThreshold: patch.confidenceThreshold ?? current.confidenceThreshold,
    allowedModes: patch.allowedModes ?? current.allowedModes,
    cooldownMinutes: patch.cooldownMinutes ?? current.cooldownMinutes,
    devilsAdvocateMode: patch.devilsAdvocateMode ?? current.devilsAdvocateMode,
  };

  const threshold = Math.min(0.95, Math.max(0.5, next.confidenceThreshold));
  const modes = next.allowedModes.filter((m) => VALID_MODES.has(m));
  const cooldown = Math.min(120, Math.max(0, Math.round(next.cooldownMinutes)));

  await pool.query(
    `INSERT INTO dp_hermes_workgroup_settings
      (workgroup_id, confidence_threshold, allowed_modes, cooldown_minutes, devils_advocate_mode, updated_by)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     ON CONFLICT (workgroup_id) DO UPDATE SET
       confidence_threshold = EXCLUDED.confidence_threshold,
       allowed_modes = EXCLUDED.allowed_modes,
       cooldown_minutes = EXCLUDED.cooldown_minutes,
       devils_advocate_mode = EXCLUDED.devils_advocate_mode,
       updated_by = EXCLUDED.updated_by,
       updated_at = now()`,
    [
      workgroupId,
      threshold,
      JSON.stringify(modes.length ? modes : DEFAULT_HERMES_WORKGROUP_SETTINGS.allowedModes),
      cooldown,
      next.devilsAdvocateMode,
      updatedBy,
    ],
  );

  return getWorkgroupHermesSettings(workgroupId);
}

export async function getLastAmbientHandAt(workgroupId: string): Promise<Date | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query(
    `SELECT created_at FROM dp_hermes_hand
     WHERE workgroup_id = $1 AND requested_explicitly = false
     ORDER BY created_at DESC LIMIT 1`,
    [workgroupId],
  );
  if (!res.rows[0]) return null;
  return new Date(String(res.rows[0].created_at));
}

export async function createHermesHand(input: {
  workgroupId: string;
  triggerMessageId: string;
  triggerMessageBody: string;
  triggerAuthorUserId: string;
  ownerUserId: string;
  mode: HermesAmbientMode;
  confidence: number;
  teaser: string;
  requestedExplicitly: boolean;
}): Promise<HermesHand> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('Database not configured');

  const id = crypto.randomUUID();
  const res = await pool.query(
    `INSERT INTO dp_hermes_hand (
      id, workgroup_id, trigger_message_id, trigger_message_body,
      trigger_author_user_id, mode, confidence, teaser,
      requested_explicitly, owner_user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.workgroupId,
      input.triggerMessageId,
      input.triggerMessageBody.slice(0, 8000),
      input.triggerAuthorUserId,
      input.mode,
      input.confidence,
      input.teaser.slice(0, 240),
      input.requestedExplicitly,
      input.ownerUserId,
    ],
  );
  return rowToHand(res.rows[0]);
}

export async function getHermesHandById(handId: string): Promise<HermesHand | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_hermes_hand WHERE id = $1', [handId]);
  return res.rows[0] ? rowToHand(res.rows[0]) : null;
}

export async function listHermesHandsForUser(
  workgroupId: string,
  userId: string,
  opts?: { includeShared?: boolean },
): Promise<HermesHand[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];

  const res = await pool.query(
    `SELECT * FROM dp_hermes_hand
     WHERE workgroup_id = $1
       AND (
         owner_user_id = $2
         OR ($3::boolean AND visibility = 'shared')
       )
       AND status != 'dismissed'
     ORDER BY created_at DESC
     LIMIT 50`,
    [workgroupId, userId, Boolean(opts?.includeShared)],
  );
  return res.rows.map(rowToHand);
}

export async function listPendingShareHands(
  workgroupId: string,
  viewerUserId: string,
  isAdmin: boolean,
): Promise<HermesHand[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];

  const res = await pool.query(
    `SELECT * FROM dp_hermes_hand
     WHERE workgroup_id = $1
       AND status = 'opened'
       AND visibility = 'private'
       AND (owner_user_id = $2 OR $3::boolean)
     ORDER BY opened_at DESC NULLS LAST
     LIMIT 20`,
    [workgroupId, viewerUserId, isAdmin],
  );
  return res.rows.map(rowToHand);
}

export async function updateHermesHand(
  handId: string,
  patch: Partial<{
    status: HermesHandStatus;
    fullReply: string;
    visibility: 'private' | 'shared';
    sharedMessageId: string;
    openedAt: Date;
    sharedAt: Date;
    dismissedAt: Date;
  }>,
): Promise<HermesHand | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (patch.status) {
    fields.push(`status = $${idx++}`);
    values.push(patch.status);
  }
  if (patch.fullReply !== undefined) {
    fields.push(`full_reply = $${idx++}`);
    values.push(patch.fullReply);
  }
  if (patch.visibility) {
    fields.push(`visibility = $${idx++}`);
    values.push(patch.visibility);
  }
  if (patch.sharedMessageId) {
    fields.push(`shared_message_id = $${idx++}`);
    values.push(patch.sharedMessageId);
  }
  if (patch.openedAt) {
    fields.push(`opened_at = $${idx++}`);
    values.push(patch.openedAt);
  }
  if (patch.sharedAt) {
    fields.push(`shared_at = $${idx++}`);
    values.push(patch.sharedAt);
  }
  if (patch.dismissedAt) {
    fields.push(`dismissed_at = $${idx++}`);
    values.push(patch.dismissedAt);
  }

  if (!fields.length) return getHermesHandById(handId);

  values.push(handId);
  const res = await pool.query(
    `UPDATE dp_hermes_hand SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return res.rows[0] ? rowToHand(res.rows[0]) : null;
}

export async function findHandForMessage(
  workgroupId: string,
  messageId: string,
  ownerUserId: string,
): Promise<HermesHand | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query(
    `SELECT * FROM dp_hermes_hand
     WHERE workgroup_id = $1 AND trigger_message_id = $2 AND owner_user_id = $3
       AND status != 'dismissed'
     ORDER BY created_at DESC LIMIT 1`,
    [workgroupId, messageId, ownerUserId],
  );
  return res.rows[0] ? rowToHand(res.rows[0]) : null;
}

export async function getLastCommunityAmbientHandAt(
  communityThreadId: string,
): Promise<Date | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query(
    `SELECT created_at FROM dp_hermes_hand
     WHERE community_thread_id = $1 AND requested_explicitly = false
     ORDER BY created_at DESC LIMIT 1`,
    [communityThreadId],
  );
  if (!res.rows[0]) return null;
  return new Date(String(res.rows[0].created_at));
}

export async function createCommunityHermesHand(input: {
  communityThreadId: string;
  triggerMessageId: string;
  triggerMessageBody: string;
  triggerAuthorUserId: string;
  ownerUserId: string;
  mode: HermesAmbientMode;
  confidence: number;
  teaser: string;
  requestedExplicitly: boolean;
}): Promise<HermesHand> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('Database not configured');

  const id = crypto.randomUUID();
  const res = await pool.query(
    `INSERT INTO dp_hermes_hand (
      id, community_thread_id, trigger_message_id, trigger_message_body,
      trigger_author_user_id, mode, confidence, teaser,
      requested_explicitly, owner_user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *`,
    [
      id,
      input.communityThreadId,
      input.triggerMessageId,
      input.triggerMessageBody.slice(0, 8000),
      input.triggerAuthorUserId,
      input.mode,
      input.confidence,
      input.teaser.slice(0, 240),
      input.requestedExplicitly,
      input.ownerUserId,
    ],
  );
  return rowToHand(res.rows[0]);
}

export async function listCommunityHermesHandsForUser(
  communityThreadId: string,
  userId: string,
  opts?: { includeShared?: boolean },
): Promise<HermesHand[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];

  const res = await pool.query(
    `SELECT * FROM dp_hermes_hand
     WHERE community_thread_id = $1
       AND (
         owner_user_id = $2
         OR ($3::boolean AND visibility = 'shared')
       )
       AND status != 'dismissed'
     ORDER BY created_at DESC
     LIMIT 50`,
    [communityThreadId, userId, Boolean(opts?.includeShared)],
  );
  return res.rows.map(rowToHand);
}

export async function listPendingCommunityShareHands(
  communityThreadId: string,
  viewerUserId: string,
): Promise<HermesHand[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];

  const res = await pool.query(
    `SELECT * FROM dp_hermes_hand
     WHERE community_thread_id = $1
       AND status = 'opened'
       AND visibility = 'private'
       AND owner_user_id = $2
     ORDER BY opened_at DESC NULLS LAST
     LIMIT 20`,
    [communityThreadId, viewerUserId],
  );
  return res.rows.map(rowToHand);
}
