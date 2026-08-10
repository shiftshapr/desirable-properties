import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';

export type InviteGlobalEvent = {
  id: string;
  title: string;
  url: string;
  eventDate: string | null;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

export type InvitePerspective = {
  id: string;
  title: string;
  url: string;
  slug: string;
  active: boolean;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

function normStr(s: unknown, max = 2000) {
  return String(s ?? '').trim().slice(0, max);
}

function parseIso(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function eventRowToModel(row: Record<string, unknown>): InviteGlobalEvent {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    url: String(row.url || ''),
    eventDate: row.event_date ? new Date(String(row.event_date)).toISOString() : null,
    description: row.description ? String(row.description) : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
  };
}

function perspectiveRowToModel(row: Record<string, unknown>): InvitePerspective {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    url: String(row.url || ''),
    slug: String(row.slug || ''),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order) || 0,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
  };
}

async function migrateForkPerspectiveSlug() {
  const pool = await ensureDpSchema();
  if (!pool) return;

  await pool.query(
    `UPDATE dp_invite_perspective
     SET url = '/perspectives/a-fork-in-the-web',
         slug = 'a-fork-in-the-web',
         updated_at = now(),
         updated_by = 'slug-migration'
     WHERE slug = 'the-fork-in-the-web'
        OR url = '/perspectives/the-fork-in-the-web'`,
  );
}

async function seedInviteContentIfEmpty() {
  const pool = await ensureDpSchema();
  if (!pool) return;

  await migrateForkPerspectiveSlug();

  const perspectiveCount = await pool.query('SELECT COUNT(*)::int AS n FROM dp_invite_perspective');
  if ((perspectiveCount.rows[0]?.n as number) > 0) return;

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO dp_invite_perspective (
       id, title, url, slug, active, sort_order, created_by, updated_by
     ) VALUES ($1, $2, $3, $4, true, 0, 'seed', 'seed')`,
    [
      id,
      'A Fork in the Web',
      '/perspectives/a-fork-in-the-web',
      'a-fork-in-the-web',
    ],
  );
}

export async function listInviteGlobalEvents(activeOnly = false): Promise<InviteGlobalEvent[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  await seedInviteContentIfEmpty();
  const res = await pool.query(
    `SELECT * FROM dp_invite_global_event
     ${activeOnly ? 'WHERE active = true' : ''}
     ORDER BY sort_order ASC, updated_at DESC`,
  );
  return res.rows.map(eventRowToModel);
}

export async function listInvitePerspectives(activeOnly = false): Promise<InvitePerspective[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  await seedInviteContentIfEmpty();
  const res = await pool.query(
    `SELECT * FROM dp_invite_perspective
     ${activeOnly ? 'WHERE active = true' : ''}
     ORDER BY sort_order ASC, updated_at DESC`,
  );
  return res.rows.map(perspectiveRowToModel);
}

export async function getInviteGlobalEvent(id: string): Promise<InviteGlobalEvent | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_invite_global_event WHERE id = $1', [id]);
  return res.rows[0] ? eventRowToModel(res.rows[0]) : null;
}

export async function getInvitePerspective(id: string): Promise<InvitePerspective | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_invite_perspective WHERE id = $1', [id]);
  return res.rows[0] ? perspectiveRowToModel(res.rows[0]) : null;
}

export async function createInviteGlobalEvent(input: Record<string, unknown>, actor: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const title = normStr(input.title, 200);
  const url = normStr(input.url, 512);
  if (!title) return { ok: false as const, error: 'title_required' };
  if (!url) return { ok: false as const, error: 'url_required' };

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO dp_invite_global_event (
       id, title, url, event_date, description, active, sort_order, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8)`,
    [
      id,
      title,
      url,
      parseIso(input.eventDate),
      normStr(input.description, 2000) || null,
      input.active === false ? false : true,
      Number.isFinite(Number(input.sortOrder)) ? Math.floor(Number(input.sortOrder)) : 0,
      normStr(actor, 120),
    ],
  );
  const event = await getInviteGlobalEvent(id);
  return { ok: true as const, event };
}

export async function updateInviteGlobalEvent(
  id: string,
  input: Record<string, unknown>,
  actor: string,
) {
  const existing = await getInviteGlobalEvent(id);
  if (!existing) return { ok: false as const, error: 'not_found' };

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  await pool.query(
    `UPDATE dp_invite_global_event SET
       title = $2, url = $3, event_date = $4, description = $5, active = $6,
       sort_order = $7, updated_at = now(), updated_by = $8
     WHERE id = $1`,
    [
      id,
      input.title != null ? normStr(input.title, 200) : existing.title,
      input.url != null ? normStr(input.url, 512) : existing.url,
      input.eventDate !== undefined ? parseIso(input.eventDate) : existing.eventDate,
      input.description !== undefined ? normStr(input.description, 2000) || null : existing.description,
      input.active !== undefined ? Boolean(input.active) : existing.active,
      input.sortOrder !== undefined
        ? Number.isFinite(Number(input.sortOrder))
          ? Math.floor(Number(input.sortOrder))
          : existing.sortOrder
        : existing.sortOrder,
      normStr(actor, 120),
    ],
  );
  const event = await getInviteGlobalEvent(id);
  return { ok: true as const, event };
}

export async function deleteInviteGlobalEvent(id: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query('DELETE FROM dp_invite_global_event WHERE id = $1 RETURNING id', [id]);
  if (!res.rowCount) return { ok: false as const, error: 'not_found' };
  return { ok: true as const, id };
}

export async function createInvitePerspective(input: Record<string, unknown>, actor: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const title = normStr(input.title, 200);
  const url = normStr(input.url, 512);
  const slug = slugify(normStr(input.slug, 120) || url.split('/').filter(Boolean).pop() || title);
  if (!title) return { ok: false as const, error: 'title_required' };
  if (!url) return { ok: false as const, error: 'url_required' };
  if (!slug) return { ok: false as const, error: 'slug_required' };

  const id = crypto.randomUUID();
  try {
    await pool.query(
      `INSERT INTO dp_invite_perspective (
         id, title, url, slug, active, sort_order, created_by, updated_by
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [
        id,
        title,
        url,
        slug,
        input.active === false ? false : true,
        Number.isFinite(Number(input.sortOrder)) ? Math.floor(Number(input.sortOrder)) : 0,
        normStr(actor, 120),
      ],
    );
  } catch (err) {
    if (String(err).includes('dp_invite_perspective_slug')) {
      return { ok: false as const, error: 'slug_taken' };
    }
    throw err;
  }
  const perspective = await getInvitePerspective(id);
  return { ok: true as const, perspective };
}

export async function updateInvitePerspective(
  id: string,
  input: Record<string, unknown>,
  actor: string,
) {
  const existing = await getInvitePerspective(id);
  if (!existing) return { ok: false as const, error: 'not_found' };

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const slug =
    input.slug != null
      ? slugify(normStr(input.slug, 120))
      : input.url != null
        ? slugify(normStr(input.url, 512).split('/').filter(Boolean).pop() || existing.slug)
        : existing.slug;
  if (!slug) return { ok: false as const, error: 'slug_required' };

  try {
    await pool.query(
      `UPDATE dp_invite_perspective SET
         title = $2, url = $3, slug = $4, active = $5,
         sort_order = $6, updated_at = now(), updated_by = $7
       WHERE id = $1`,
      [
        id,
        input.title != null ? normStr(input.title, 200) : existing.title,
        input.url != null ? normStr(input.url, 512) : existing.url,
        slug,
        input.active !== undefined ? Boolean(input.active) : existing.active,
        input.sortOrder !== undefined
          ? Number.isFinite(Number(input.sortOrder))
            ? Math.floor(Number(input.sortOrder))
            : existing.sortOrder
          : existing.sortOrder,
        normStr(actor, 120),
      ],
    );
  } catch (err) {
    if (String(err).includes('dp_invite_perspective_slug')) {
      return { ok: false as const, error: 'slug_taken' };
    }
    throw err;
  }
  const perspective = await getInvitePerspective(id);
  return { ok: true as const, perspective };
}

export async function deleteInvitePerspective(id: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query('DELETE FROM dp_invite_perspective WHERE id = $1 RETURNING id', [id]);
  if (!res.rowCount) return { ok: false as const, error: 'not_found' };
  return { ok: true as const, id };
}

export function publicInviteEventPayload(event: InviteGlobalEvent) {
  return {
    id: event.id,
    title: event.title,
    url: event.url,
    eventDate: event.eventDate,
    description: event.description,
  };
}

export function publicInvitePerspectivePayload(perspective: InvitePerspective) {
  return {
    id: perspective.id,
    title: perspective.title,
    url: perspective.url,
    slug: perspective.slug,
  };
}
