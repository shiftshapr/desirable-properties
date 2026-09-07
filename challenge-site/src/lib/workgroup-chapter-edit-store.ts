import { randomUUID } from 'crypto';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import {
  applyPatchToMarkdown,
  anchorHashFromPassage,
  passageExistsInMarkdown,
  type ChapterPatchMode,
} from '@/lib/workgroup-chapter-patch';
import {
  isLegacyFullChapterEdit,
  previewEditOnMarkdown,
  type WorkgroupChapterEdit,
  type WorkgroupChapterEditList,
  type WorkgroupChapterEditStatus,
} from '@/lib/workgroup-chapter-edit-types';

export type ChapterEditReviewAction = 'approve' | 'reject' | 'revoke' | 'restore';

export function isWorkgroupChapterEditDbConfigured(): boolean {
  return isDpDatabaseConfigured();
}

type EditRow = {
  id: string;
  workgroup_id: string;
  dp_key: string;
  astra_release_id: string;
  markdown: string | null;
  base_markdown: string | null;
  patch_mode: string | null;
  original_text: string | null;
  proposed_text: string | null;
  anchor_hash: string | null;
  rationale: string | null;
  author_user_id: string;
  author_name: string;
  status: WorkgroupChapterEditStatus;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  revoked_by: string | null;
  revoked_at: Date | null;
  created_at: Date;
};

const EDIT_SELECT = `id, workgroup_id, dp_key, astra_release_id, markdown, base_markdown,
            patch_mode, original_text, proposed_text, anchor_hash, rationale,
            author_user_id, author_name, status, reviewed_by, reviewed_at, revoked_by, revoked_at, created_at`;

function mapPatchMode(raw: string | null): ChapterPatchMode | null {
  if (raw === 'replace' || raw === 'insert') return raw;
  return null;
}

function mapRow(row: EditRow): WorkgroupChapterEdit {
  return {
    id: row.id,
    workgroupId: row.workgroup_id,
    dpKey: row.dp_key,
    astraReleaseId: row.astra_release_id,
    markdown: row.markdown,
    baseMarkdown: row.base_markdown,
    patchMode: mapPatchMode(row.patch_mode),
    originalText: row.original_text,
    proposedText: row.proposed_text,
    anchorHash: row.anchor_hash,
    rationale: row.rationale,
    authorUserId: row.author_user_id,
    authorName: row.author_name,
    status: row.status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    revokedBy: row.revoked_by,
    revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function applyActiveEdit(text: string, edit: WorkgroupChapterEdit): { text: string; applied: boolean } {
  if (isLegacyFullChapterEdit(edit)) {
    return { text: edit.markdown!, applied: true };
  }
  if (edit.patchMode && edit.originalText && edit.proposedText) {
    const next = applyPatchToMarkdown(text, {
      patchMode: edit.patchMode,
      originalText: edit.originalText,
      proposedText: edit.proposedText,
    });
    if (next !== null) return { text: next, applied: true };
  }
  return { text, applied: false };
}

export function resolveEffectiveMarkdown(
  baseMarkdown: string,
  edits: WorkgroupChapterEdit[],
): { effectiveMarkdown: string; hasMemberEdits: boolean; pendingCount: number } {
  const pendingCount = edits.filter((edit) => edit.status === 'pending').length;
  const active = edits
    .filter((edit) => edit.status === 'active')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  let text = baseMarkdown;
  let hasMemberEdits = false;
  for (const edit of active) {
    const result = applyActiveEdit(text, edit);
    text = result.text;
    if (result.applied) hasMemberEdits = true;
  }

  return { effectiveMarkdown: text, hasMemberEdits, pendingCount };
}

function emptyList(baseMarkdown: string): WorkgroupChapterEditList {
  return {
    edits: [],
    effectiveMarkdown: baseMarkdown,
    baseMarkdown,
    hasMemberEdits: false,
    pendingCount: 0,
  };
}

export async function fetchWorkgroupChapterEdits(
  workgroupId: string,
  dpKey: string,
  baseMarkdown: string,
): Promise<WorkgroupChapterEditList> {
  const wgId = String(workgroupId || '').trim();
  const key = String(dpKey || '').trim().toLowerCase();
  if (!wgId || !key) return emptyList(baseMarkdown);

  const pool = await ensureDpSchema();
  if (!pool) return emptyList(baseMarkdown);

  const res = await pool.query<EditRow>(
    `SELECT ${EDIT_SELECT}
     FROM workgroup_chapter_edit
     WHERE workgroup_id = $1 AND dp_key = $2
     ORDER BY created_at ASC`,
    [wgId, key],
  );

  const edits = res.rows.map(mapRow);
  const { effectiveMarkdown, hasMemberEdits, pendingCount } = resolveEffectiveMarkdown(
    baseMarkdown,
    edits,
  );
  return { edits, effectiveMarkdown, baseMarkdown, hasMemberEdits, pendingCount };
}

export async function createWorkgroupChapterEdit(input: {
  workgroupId: string;
  dpKey: string;
  astraReleaseId: string;
  patchMode: ChapterPatchMode;
  originalText: string;
  proposedText: string;
  baseMarkdown: string;
  rationale?: string | null;
  authorUserId: string;
  authorName: string;
}): Promise<WorkgroupChapterEdit | null> {
  const wgId = String(input.workgroupId || '').trim();
  const dpKey = String(input.dpKey || '').trim().toLowerCase();
  const releaseId = String(input.astraReleaseId || '').trim();
  const originalText = String(input.originalText || '').trim();
  const proposedText = String(input.proposedText || '').trim();
  const baseMarkdown = String(input.baseMarkdown || '');
  const authorUserId = String(input.authorUserId || '').trim();
  const authorName = String(input.authorName || 'Member').trim() || 'Member';
  const patchMode = input.patchMode;

  if (!wgId || !dpKey || !releaseId || !authorUserId || !originalText || !proposedText) {
    return null;
  }
  if (patchMode !== 'replace' && patchMode !== 'insert') return null;

  const pool = await ensureDpSchema();
  if (!pool) return null;

  const id = randomUUID();
  const rationale = String(input.rationale || '').trim() || null;
  const anchorHash = anchorHashFromPassage(originalText);

  const res = await pool.query<EditRow>(
    `INSERT INTO workgroup_chapter_edit (
       id, workgroup_id, dp_key, astra_release_id, markdown, base_markdown,
       patch_mode, original_text, proposed_text, anchor_hash, rationale,
       author_user_id, author_name, status, created_at
     ) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', now())
     RETURNING ${EDIT_SELECT}`,
    [
      id,
      wgId,
      dpKey,
      releaseId,
      baseMarkdown,
      patchMode,
      originalText,
      proposedText,
      anchorHash,
      rationale,
      authorUserId,
      authorName,
    ],
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function reviewWorkgroupChapterEdit(input: {
  editId: string;
  workgroupId: string;
  dpKey: string;
  baseMarkdown: string;
  action: ChapterEditReviewAction;
  reviewerUserId: string;
}): Promise<{ ok: true; previousStatus: WorkgroupChapterEditStatus } | { ok: false; error: string }> {
  const id = String(input.editId || '').trim();
  const wgId = String(input.workgroupId || '').trim();
  const dpKey = String(input.dpKey || '').trim().toLowerCase();
  const reviewer = String(input.reviewerUserId || '').trim();
  if (!id || !wgId || !reviewer || !dpKey) return { ok: false, error: 'invalid_request' };

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false, error: 'storage_unavailable' };

  const current = await pool.query<EditRow>(
    `SELECT ${EDIT_SELECT} FROM workgroup_chapter_edit WHERE id = $1 AND workgroup_id = $2`,
    [id, wgId],
  );
  const row = current.rows[0];
  if (!row) return { ok: false, error: 'edit_not_found' };

  const edit = mapRow(row);
  const { action } = input;
  const status = row.status;

  if (action === 'approve') {
    if (status !== 'pending') return { ok: false, error: 'not_pending' };

    const allEdits = await fetchWorkgroupChapterEdits(wgId, dpKey, input.baseMarkdown);
    const activeWithoutPending = allEdits.edits.filter(
      (item) => item.status === 'active' && item.id !== edit.id,
    );
    const { effectiveMarkdown } = resolveEffectiveMarkdown(input.baseMarkdown, activeWithoutPending);

    if (isLegacyFullChapterEdit(edit)) {
      if (!edit.markdown?.trim()) return { ok: false, error: 'invalid_edit' };
    } else if (!edit.patchMode || !edit.originalText || !edit.proposedText) {
      return { ok: false, error: 'invalid_edit' };
    } else if (!passageExistsInMarkdown(effectiveMarkdown, edit.originalText)) {
      return { ok: false, error: 'anchor_missing' };
    } else {
      const preview = previewEditOnMarkdown(effectiveMarkdown, edit);
      if (preview === null) return { ok: false, error: 'anchor_missing' };
    }

    await pool.query(
      `UPDATE workgroup_chapter_edit
       SET status = 'active', reviewed_by = $3, reviewed_at = now(),
           revoked_by = NULL, revoked_at = NULL
       WHERE id = $1 AND workgroup_id = $2`,
      [id, wgId, reviewer],
    );
    return { ok: true, previousStatus: status };
  }

  if (action === 'reject') {
    if (status !== 'pending') return { ok: false, error: 'not_pending' };
    await pool.query(
      `UPDATE workgroup_chapter_edit
       SET status = 'rejected', reviewed_by = $3, reviewed_at = now()
       WHERE id = $1 AND workgroup_id = $2`,
      [id, wgId, reviewer],
    );
    return { ok: true, previousStatus: status };
  }

  if (action === 'revoke') {
    if (status !== 'active') return { ok: false, error: 'not_active' };
    await pool.query(
      `UPDATE workgroup_chapter_edit
       SET status = 'revoked', revoked_by = $3, revoked_at = now()
       WHERE id = $1 AND workgroup_id = $2`,
      [id, wgId, reviewer],
    );
    return { ok: true, previousStatus: status };
  }

  if (action === 'restore') {
    if (status !== 'revoked') return { ok: false, error: 'not_revoked' };
    await pool.query(
      `UPDATE workgroup_chapter_edit
       SET status = 'active', revoked_by = NULL, revoked_at = NULL
       WHERE id = $1 AND workgroup_id = $2`,
      [id, wgId],
    );
    return { ok: true, previousStatus: status };
  }

  return { ok: false, error: 'invalid_action' };
}

/** @deprecated Use reviewWorkgroupChapterEdit */
export async function setWorkgroupChapterEditStatus(
  editId: string,
  workgroupId: string,
  status: WorkgroupChapterEditStatus,
  revokedBy?: string | null,
): Promise<boolean> {
  if (status === 'revoked') {
    const result = await reviewWorkgroupChapterEdit({
      editId,
      workgroupId,
      dpKey: '',
      baseMarkdown: '',
      action: 'revoke',
      reviewerUserId: String(revokedBy || ''),
    });
    return result.ok;
  }
  if (status === 'active') {
    const result = await reviewWorkgroupChapterEdit({
      editId,
      workgroupId,
      dpKey: '',
      baseMarkdown: '',
      action: 'restore',
      reviewerUserId: String(revokedBy || 'coordinator'),
    });
    return result.ok;
  }
  return false;
}
