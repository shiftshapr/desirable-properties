import { randomUUID } from 'crypto';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import type { ReviewEvalComment, ReviewVote } from '@/lib/workgroup-review-types';

export type ReviewEvalRow = {
  itemKey: string;
  userId: string;
  userName: string;
  vote: ReviewVote;
  comment: string | null;
  updatedAt: string;
};

export async function listReviewEvals(
  workgroupId: string,
): Promise<ReviewEvalRow[]> {
  if (!isDpDatabaseConfigured()) return [];
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query<{
    item_key: string;
    user_id: string;
    user_name: string;
    vote: ReviewVote;
    comment: string | null;
    updated_at: Date;
  }>(
    `SELECT item_key, user_id, user_name, vote, comment, updated_at
     FROM workgroup_review_eval
     WHERE workgroup_id = $1
     ORDER BY updated_at DESC`,
    [workgroupId],
  );
  return res.rows.map((row) => ({
    itemKey: row.item_key,
    userId: row.user_id,
    userName: row.user_name,
    vote: row.vote,
    comment: row.comment,
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

export async function upsertReviewEval(opts: {
  workgroupId: string;
  itemKey: string;
  userId: string;
  userName: string;
  vote: ReviewVote;
  comment?: string | null;
}): Promise<ReviewEvalRow | null> {
  if (!isDpDatabaseConfigured()) return null;
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const comment = String(opts.comment || '').trim() || null;
  const res = await pool.query<{
    item_key: string;
    user_id: string;
    user_name: string;
    vote: ReviewVote;
    comment: string | null;
    updated_at: Date;
  }>(
    `INSERT INTO workgroup_review_eval
       (id, workgroup_id, item_key, user_id, user_name, vote, comment, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now(), now())
     ON CONFLICT (workgroup_id, item_key, user_id)
     DO UPDATE SET vote = EXCLUDED.vote, comment = EXCLUDED.comment,
                   user_name = EXCLUDED.user_name, updated_at = now()
     RETURNING item_key, user_id, user_name, vote, comment, updated_at`,
    [
      randomUUID(),
      opts.workgroupId,
      opts.itemKey,
      opts.userId,
      opts.userName,
      opts.vote,
      comment,
    ],
  );
  const row = res.rows[0];
  if (!row) return null;
  return {
    itemKey: row.item_key,
    userId: row.user_id,
    userName: row.user_name,
    vote: row.vote,
    comment: row.comment,
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

export function evalsForItem(
  rows: ReviewEvalRow[],
  itemKey: string,
  viewerUserId?: string | null,
): {
  yes: number;
  no: number;
  mine: ReviewVote | null;
  comments: ReviewEvalComment[];
} {
  const mineRow = rows.find(
    (row) => row.itemKey === itemKey && row.userId === viewerUserId,
  );
  const matching = rows.filter((row) => row.itemKey === itemKey);
  return {
    yes: matching.filter((row) => row.vote === 'yes').length,
    no: matching.filter((row) => row.vote === 'no').length,
    mine: mineRow?.vote || null,
    comments: matching
      .filter((row) => row.comment)
      .map((row) => ({
        userId: row.userId,
        userName: row.userName,
        vote: row.vote,
        comment: String(row.comment),
        updatedAt: row.updatedAt,
      })),
  };
}
