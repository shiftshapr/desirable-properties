import { randomUUID } from 'crypto';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import type {
  WorkgroupChapterEdit,
  WorkgroupChapterEditList,
  WorkgroupChapterEditStatus,
} from '@/lib/workgroup-chapter-edit-types';

export function isWorkgroupChapterEditDbConfigured(): boolean {
  return isDpDatabaseConfigured();
}

type EditRow = {
  id: string;
  workgroup_id: string;
  dp_key: string;
  astra_release_id: string;
  markdown: string;
  rationale: string | null;
  author_user_id: string;
  author_name: string;
  status: WorkgroupChapterEditStatus;
  revoked_by: string | null;
  revoked_at: Date | null;
  created_at: Date;
};

function mapRow(row: EditRow): WorkgroupChapterEdit {
  return {
    id: row.id,
    workgroupId: row.workgroup_id,
    dpKey: row.dp_key,
    astraReleaseId: row.astra_release_id,
    markdown: row.markdown,
    rationale: row.rationale,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    status: row.status,
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function resolveEffectiveMarkdown(
  baseMarkdown: string,
  edits: WorkgroupChapterEdit[],
): { effectiveMarkdown: string; hasMemberEdits: boolean } {
  const active = edits
    .filter((edit) => edit.status === 'active')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!active.length) {
    return { effectiveMarkdown: baseMarkdown, hasMemberEdits: false };
  }
  return {
    effectiveMarkdown: active[active.length - 1]!.markdown,
    hasMemberEdits: true,
  };
}

export async function fetchWorkgroupChapterEdits(
  workgroupId: string,
  dpKey: string,
  baseMarkdown: string,
): Promise<WorkgroupChapterEditList> {
  const wgId = String(workgroupId || '').trim();
  const key = String(dpKey || '').trim().toLowerCase();
  if (!wgId || !key) {
    return {
      edits: [],
      effectiveMarkdown: baseMarkdown,
      baseMarkdown,
      hasMemberEdits: false,
    };
  }

  const pool = await ensureDpSchema();
  if (!pool) {
    return {
      edits: [],
      effectiveMarkdown: baseMarkdown,
      baseMarkdown,
      hasMemberEdits: false,
    };
  }

  const res = await pool.query<EditRow>(
    `SELECT id, workgroup_id, dp_key, astra_release_id, markdown, rationale,
            author_user_id, author_name, status, revoked_by, revoked_at, created_at
     FROM workgroup_chapter_edit
     WHERE workgroup_id = $1 AND dp_key = $2
     ORDER BY created_at ASC`,
    [wgId, key],
  );

  const edits = res.rows.map(mapRow);
  const { effectiveMarkdown, hasMemberEdits } = resolveEffectiveMarkdown(baseMarkdown, edits);
  return { edits, effectiveMarkdown, baseMarkdown, hasMemberEdits };
}

export async function createWorkgroupChapterEdit(input: {
  workgroupId: string;
  dpKey: string;
  astraReleaseId: string;
  markdown: string;
  rationale?: string | null;
  authorUserId: string;
  authorName: string;
}): Promise<WorkgroupChapterEdit | null> {
  const wgId = String(input.workgroupId || '').trim();
  const dpKey = String(input.dpKey || '').trim().toLowerCase();
  const releaseId = String(input.astraReleaseId || '').trim();
  const markdown = String(input.markdown || '');
  const authorUserId = String(input.authorUserId || '').trim();
  const authorName = String(input.authorName || 'Member').trim() || 'Member';
  if (!wgId || !dpKey || !releaseId || !authorUserId || !markdown.trim()) return null;

  const pool = await ensureDpSchema();
  if (!pool) return null;

  const id = randomUUID();
  const rationale = String(input.rationale || '').trim() || null;

  const res = await pool.query<EditRow>(
    `INSERT INTO workgroup_chapter_edit (
       id, workgroup_id, dp_key, astra_release_id, markdown, rationale,
       author_user_id, author_name, status, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', now())
     RETURNING id, workgroup_id, dp_key, astra_release_id, markdown, rationale,
               author_user_id, author_name, status, revoked_by, revoked_at, created_at`,
    [id, wgId, dpKey, releaseId, markdown, rationale, authorUserId, authorName],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function setWorkgroupChapterEditStatus(
  editId: string,
  workgroupId: string,
  status: WorkgroupChapterEditStatus,
  revokedBy?: string | null,
): Promise<boolean> {
  const id = String(editId || '').trim();
  const wgId = String(workgroupId || '').trim();
  if (!id || !wgId) return false;

  const pool = await ensureDpSchema();
  if (!pool) return false;

  if (status === 'revoked') {
    const revoker = String(revokedBy || '').trim();
    if (!revoker) return false;
    await pool.query(
      `UPDATE workgroup_chapter_edit
       SET status = 'revoked', revoked_by = $3, revoked_at = now()
       WHERE id = $1 AND workgroup_id = $2`,
      [id, wgId, revoker],
    );
    return true;
  }

  await pool.query(
    `UPDATE workgroup_chapter_edit
     SET status = 'active', revoked_by = NULL, revoked_at = NULL
     WHERE id = $1 AND workgroup_id = $2`,
    [id, wgId],
  );
  return true;
}
