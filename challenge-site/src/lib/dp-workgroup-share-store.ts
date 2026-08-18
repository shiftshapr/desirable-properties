import crypto from 'crypto';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import type { WorkgroupShareRole } from '@/lib/workgroup-share-restrictions';

export type WorkgroupMessageShareRecord = {
  id: string;
  workgroupId: string;
  anchorMessageId: string;
  sharerUserId: string;
  recipientUserId: string;
  sendeeRole: WorkgroupShareRole;
  note: string | null;
  status: 'active' | 'revoked';
  createdAt: string;
};

function rowToShare(row: Record<string, unknown>): WorkgroupMessageShareRecord {
  return {
    id: String(row.id),
    workgroupId: String(row.workgroup_id),
    anchorMessageId: String(row.anchor_message_id),
    sharerUserId: String(row.sharer_user_id),
    recipientUserId: String(row.recipient_user_id),
    sendeeRole: row.sendee_role === 'controller' ? 'controller' : 'watcher',
    note: row.note ? String(row.note) : null,
    status: row.status === 'revoked' ? 'revoked' : 'active',
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export function isWorkgroupShareDbConfigured(): boolean {
  return isDpDatabaseConfigured();
}

export async function createWorkgroupMessageShare(input: {
  workgroupId: string;
  anchorMessageId: string;
  sharerUserId: string;
  recipientUserId: string;
  sendeeRole: WorkgroupShareRole;
  note?: string | null;
}): Promise<WorkgroupMessageShareRecord> {
  const pool = await ensureDpSchema();
  if (!pool) {
    throw new Error('Workgroup share database not configured');
  }

  const id = crypto.randomUUID();
  const note = input.note?.trim() ? input.note.trim().slice(0, 2000) : null;

  const res = await pool.query(
    `INSERT INTO dp_workgroup_message_share (
       id, workgroup_id, anchor_message_id, sharer_user_id,
       recipient_user_id, sendee_role, note, status, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', now())
     RETURNING *`,
    [
      id,
      input.workgroupId,
      input.anchorMessageId,
      input.sharerUserId,
      input.recipientUserId,
      input.sendeeRole,
      note,
    ],
  );

  return rowToShare(res.rows[0] as Record<string, unknown>);
}
