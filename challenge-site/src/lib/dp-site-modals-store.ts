import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';

const VALID_VARIANTS = new Set(['info', 'success', 'warning', 'danger']);
const VALID_AUDIENCES = new Set(['public', 'signed_in', 'workgroup']);
const VALID_SITES = new Set([
  'all',
  'home',
  'challenge',
  'participate',
  'workgroups',
  'support',
  'about',
  'admin',
]);

export type DpSiteModal = {
  id: string;
  title: string;
  message: string;
  question: string | null;
  videoUrl: string | null;
  variant: string;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
  status: string;
  sites: string[];
  audience: string;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
};

function normStr(s: unknown, max = 8000) {
  return String(s ?? '').trim().slice(0, max);
}

function parseIso(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function normalizeSites(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : ['all'];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const key = String(item || '').trim().toLowerCase();
    if (!key || !VALID_SITES.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out.length ? out : ['all'];
}

function resolveEndAt(startAt: string | null, endAtRaw: unknown, durationMinutesRaw: unknown) {
  const endAt = parseIso(endAtRaw);
  if (endAt) return endAt;
  const duration = Number(durationMinutesRaw);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  const startMs = startAt ? Date.parse(startAt) : Date.now();
  if (!Number.isFinite(startMs)) return null;
  return new Date(startMs + duration * 60 * 1000).toISOString();
}

export function computeModalStatus(modal: DpSiteModal, now = Date.now()): string {
  if (modal.status === 'draft') return 'draft';
  const startMs = modal.startAt ? Date.parse(modal.startAt) : NaN;
  const endMs = modal.endAt ? Date.parse(modal.endAt) : NaN;
  if (Number.isFinite(startMs) && now < startMs) return 'scheduled';
  if (Number.isFinite(endMs) && now > endMs) return 'ended';
  return 'active';
}

function rowToModal(row: Record<string, unknown>): DpSiteModal {
  const modal: DpSiteModal = {
    id: String(row.id),
    title: String(row.title || ''),
    message: String(row.message || ''),
    question: row.question ? String(row.question) : null,
    videoUrl: row.video_url ? String(row.video_url) : null,
    variant: String(row.variant || 'info'),
    startAt: row.start_at ? new Date(String(row.start_at)).toISOString() : null,
    endAt: row.end_at ? new Date(String(row.end_at)).toISOString() : null,
    durationMinutes: row.duration_minutes != null ? Number(row.duration_minutes) : null,
    status: String(row.status || 'draft'),
    sites: Array.isArray(row.sites) ? (row.sites as string[]) : ['all'],
    audience: String(row.audience || 'public'),
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : null,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
  };
  return { ...modal, status: computeModalStatus(modal) };
}

function modalMatchesSite(modal: DpSiteModal, site: string) {
  const sites = normalizeSites(modal.sites);
  if (sites.includes('all')) return true;
  const key = String(site || '').trim().toLowerCase() || 'all';
  return sites.includes(key);
}

export async function listSiteModals(includeDraft = true): Promise<DpSiteModal[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query('SELECT * FROM dp_site_modal ORDER BY updated_at DESC');
  const modals = res.rows.map(rowToModal);
  if (includeDraft) return modals;
  return modals.filter((m) => m.status !== 'draft' && m.status !== 'ended');
}

export async function getSiteModal(id: string): Promise<DpSiteModal | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_site_modal WHERE id = $1', [id]);
  return res.rows[0] ? rowToModal(res.rows[0]) : null;
}

export async function getActiveSiteModals(site: string, signedIn = false): Promise<DpSiteModal[]> {
  const modals = await listSiteModals(false);
  const now = Date.now();
  return modals.filter((modal) => {
    if (modal.status !== 'active' && computeModalStatus(modal, now) !== 'active') return false;
    if (!modalMatchesSite(modal, site)) return false;
    const audience = modal.audience || 'public';
    if (audience === 'public') return true;
    if (audience === 'signed_in') return signedIn;
    if (audience === 'workgroup') return signedIn;
    return false;
  });
}

export async function createSiteModal(input: Record<string, unknown>, actor: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const title = normStr(input.title, 200);
  if (!title) return { ok: false as const, error: 'title_required' };

  const variant = normStr(input.variant, 32).toLowerCase();
  const audience = normStr(input.audience, 32).toLowerCase();
  const startAt = parseIso(input.startAt);
  const endAt = resolveEndAt(startAt, input.endAt, input.durationMinutes);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO dp_site_modal (
       id, title, message, question, video_url, variant, start_at, end_at,
       duration_minutes, status, sites, audience, created_at, updated_at, created_by, updated_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$13,$14,$14)`,
    [
      id,
      title,
      normStr(input.message, 8000),
      normStr(input.question, 500) || null,
      normStr(input.videoUrl, 512) || null,
      VALID_VARIANTS.has(variant) ? variant : 'info',
      startAt,
      endAt,
      Number.isFinite(Number(input.durationMinutes)) ? Math.floor(Number(input.durationMinutes)) : null,
      normStr(input.status, 32) === 'draft' ? 'draft' : 'scheduled',
      JSON.stringify(normalizeSites(input.sites)),
      VALID_AUDIENCES.has(audience) ? audience : 'public',
      now,
      normStr(actor, 120),
    ],
  );

  const modal = await getSiteModal(id);
  return { ok: true as const, modal };
}

export async function updateSiteModal(id: string, input: Record<string, unknown>, actor: string) {
  const existing = await getSiteModal(id);
  if (!existing) return { ok: false as const, error: 'not_found' };

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const title = input.title != null ? normStr(input.title, 200) : existing.title;
  const variantRaw = input.variant != null ? normStr(input.variant, 32).toLowerCase() : existing.variant;
  const audienceRaw = input.audience != null ? normStr(input.audience, 32).toLowerCase() : existing.audience;
  const startAt = input.startAt != null ? parseIso(input.startAt) : existing.startAt;
  const endAt =
    input.endAt != null || input.durationMinutes != null
      ? resolveEndAt(startAt, input.endAt ?? existing.endAt, input.durationMinutes ?? existing.durationMinutes)
      : existing.endAt;

  await pool.query(
    `UPDATE dp_site_modal SET
       title = $2, message = $3, question = $4, video_url = $5, variant = $6,
       start_at = $7, end_at = $8, duration_minutes = $9, status = $10,
       sites = $11::jsonb, audience = $12, updated_at = now(), updated_by = $13
     WHERE id = $1`,
    [
      id,
      title,
      input.message != null ? normStr(input.message, 8000) : existing.message,
      input.question != null ? normStr(input.question, 500) || null : existing.question,
      input.videoUrl != null ? normStr(input.videoUrl, 512) || null : existing.videoUrl,
      VALID_VARIANTS.has(variantRaw) ? variantRaw : existing.variant,
      startAt,
      endAt,
      input.durationMinutes != null
        ? Number.isFinite(Number(input.durationMinutes))
          ? Math.floor(Number(input.durationMinutes))
          : null
        : existing.durationMinutes,
      input.status != null
        ? normStr(input.status, 32) === 'draft'
          ? 'draft'
          : 'scheduled'
        : existing.status === 'draft'
          ? 'draft'
          : 'scheduled',
      JSON.stringify(input.sites != null ? normalizeSites(input.sites) : existing.sites),
      VALID_AUDIENCES.has(audienceRaw) ? audienceRaw : existing.audience,
      normStr(actor, 120),
    ],
  );

  const modal = await getSiteModal(id);
  return { ok: true as const, modal };
}

export async function duplicateSiteModal(id: string, actor: string) {
  const existing = await getSiteModal(id);
  if (!existing) return { ok: false as const, error: 'not_found' };
  return createSiteModal(
    {
      ...existing,
      title: `${existing.title} (copy)`,
      status: 'draft',
    },
    actor,
  );
}

export async function deleteSiteModal(id: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query('DELETE FROM dp_site_modal WHERE id = $1 RETURNING id', [id]);
  if (!res.rowCount) return { ok: false as const, error: 'not_found' };
  return { ok: true as const, id };
}

export function publicModalPayload(modal: DpSiteModal) {
  return {
    id: modal.id,
    title: modal.title,
    message: modal.message,
    question: modal.question,
    videoUrl: modal.videoUrl,
    variant: modal.variant,
    startAt: modal.startAt,
    endAt: modal.endAt,
    status: modal.status,
    sites: modal.sites,
    audience: modal.audience,
  };
}
