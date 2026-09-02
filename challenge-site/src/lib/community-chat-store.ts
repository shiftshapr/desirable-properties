import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';

export type CommunityChatMessage = {
  id: string;
  community_thread_id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  source: 'human' | 'deepi_shared';
  created_at: string;
  edited_at: string | null;
};

function rowToMessage(row: Record<string, unknown>): CommunityChatMessage {
  const editedRaw = row.edited_at;
  return {
    id: String(row.id),
    community_thread_id: String(row.community_thread_id),
    author_user_id: String(row.author_user_id),
    author_name: String(row.author_name || ''),
    body: String(row.body || ''),
    source: row.source === 'deepi_shared' ? 'deepi_shared' : 'human',
    created_at: new Date(String(row.created_at)).toISOString(),
    edited_at: editedRaw ? new Date(String(editedRaw)).toISOString() : null,
  };
}

export async function listCommunityChatMessages(
  communityThreadId: string,
): Promise<CommunityChatMessage[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];

  const res = await pool.query(
    `SELECT * FROM dp_community_chat_message
     WHERE community_thread_id = $1
     ORDER BY created_at ASC
     LIMIT 500`,
    [communityThreadId],
  );
  return res.rows.map(rowToMessage);
}

export async function createCommunityChatMessage(input: {
  communityThreadId: string;
  authorUserId: string;
  authorName: string;
  body: string;
  source?: 'human' | 'deepi_shared';
}): Promise<CommunityChatMessage> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('Database not configured');

  const id = crypto.randomUUID();
  const res = await pool.query(
    `INSERT INTO dp_community_chat_message (
      id, community_thread_id, author_user_id, author_name, body, source
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      id,
      input.communityThreadId,
      input.authorUserId,
      input.authorName.slice(0, 200),
      input.body.slice(0, 8000),
      input.source || 'human',
    ],
  );
  return rowToMessage(res.rows[0]);
}

export async function getCommunityChatMessage(
  messageId: string,
  communityThreadId: string,
): Promise<CommunityChatMessage | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;

  const res = await pool.query(
    `SELECT * FROM dp_community_chat_message
     WHERE id = $1 AND community_thread_id = $2
     LIMIT 1`,
    [messageId, communityThreadId],
  );
  if (!res.rows.length) return null;
  return rowToMessage(res.rows[0]);
}

export async function updateCommunityChatMessage(input: {
  messageId: string;
  communityThreadId: string;
  authorUserId: string;
  body: string;
}): Promise<CommunityChatMessage | null> {
  const pool = await ensureDpSchema();
  if (!pool) throw new Error('Database not configured');

  const res = await pool.query(
    `UPDATE dp_community_chat_message
     SET body = $4, edited_at = now()
     WHERE id = $1
       AND community_thread_id = $2
       AND author_user_id = $3
       AND source = 'human'
     RETURNING *`,
    [
      input.messageId,
      input.communityThreadId,
      input.authorUserId,
      input.body.slice(0, 8000),
    ],
  );
  if (!res.rows.length) return null;
  return rowToMessage(res.rows[0]);
}
