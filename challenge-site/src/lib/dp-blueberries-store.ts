import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';

const VALID_KINDS = new Set(['challenge', 'govhub_action', 'reply', 'custom']);

export type DpBlueberry = {
  id: string;
  label: string;
  description: string;
  kind: string;
  govhubMessageId: string | null;
  govhubUrl: string | null;
  dpIds: string[];
  sortOrder: number;
  requiresAcceptance: boolean;
  active: boolean;
  availableFrom: string | null;
  availableUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DpBlueberrySettings = {
  introText: string;
  available: boolean;
  unavailableMessage: string;
  updatedAt: string;
};

function normStr(s: unknown, max = 4000) {
  return String(s ?? '').trim().slice(0, max);
}

function parseIso(raw: unknown): string | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function normalizeDpIds(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const match = String(item || '').trim().toUpperCase().match(/^DP(\d+)$/);
    if (!match) continue;
    const id = `DP${match[1]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
}

function rowToBlueberry(row: Record<string, unknown>): DpBlueberry {
  return {
    id: String(row.id),
    label: String(row.label || ''),
    description: String(row.description || ''),
    kind: String(row.kind || 'challenge'),
    govhubMessageId: row.govhub_message_id ? String(row.govhub_message_id) : null,
    govhubUrl: row.govhub_url ? String(row.govhub_url) : null,
    dpIds: Array.isArray(row.dp_ids) ? (row.dp_ids as string[]) : [],
    sortOrder: Number(row.sort_order) || 0,
    requiresAcceptance: Boolean(row.requires_acceptance),
    active: Boolean(row.active),
    availableFrom: row.available_from ? new Date(String(row.available_from)).toISOString() : null,
    availableUntil: row.available_until ? new Date(String(row.available_until)).toISOString() : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function getBlueberrySettings(): Promise<DpBlueberrySettings> {
  const pool = await ensureDpSchema();
  if (!pool) {
    return {
      introText: '',
      available: true,
      unavailableMessage: '',
      updatedAt: new Date().toISOString(),
    };
  }
  const res = await pool.query('SELECT * FROM dp_blueberry_settings WHERE id = 1');
  const row = res.rows[0];
  return {
    introText: String(row?.intro_text || ''),
    available: row?.available !== false,
    unavailableMessage: String(row?.unavailable_message || ''),
    updatedAt: row?.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
  };
}

export async function saveBlueberrySettings(input: Partial<DpBlueberrySettings>) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  await pool.query(
    `UPDATE dp_blueberry_settings SET
       intro_text = COALESCE($1, intro_text),
       available = COALESCE($2, available),
       unavailable_message = COALESCE($3, unavailable_message),
       updated_at = now()
     WHERE id = 1`,
    [
      input.introText != null ? normStr(input.introText, 4000) : null,
      input.available != null ? Boolean(input.available) : null,
      input.unavailableMessage != null ? normStr(input.unavailableMessage, 1000) : null,
    ],
  );

  const settings = await getBlueberrySettings();
  return { ok: true as const, settings };
}

export async function listBlueberries(): Promise<DpBlueberry[]> {
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query('SELECT * FROM dp_blueberry ORDER BY sort_order ASC, created_at ASC');
  return res.rows.map(rowToBlueberry);
}

export async function getBlueberry(id: string): Promise<DpBlueberry | null> {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_blueberry WHERE id = $1', [id]);
  return res.rows[0] ? rowToBlueberry(res.rows[0]) : null;
}

export async function createBlueberry(input: Record<string, unknown>) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const label = normStr(input.label, 200);
  if (!label) return { ok: false as const, error: 'label_required' };

  const kind = normStr(input.kind, 32).toLowerCase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await pool.query(
    `INSERT INTO dp_blueberry (
       id, label, description, kind, govhub_message_id, govhub_url, dp_ids,
       sort_order, requires_acceptance, active, available_from, available_until,
       created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13,$13)`,
    [
      id,
      label,
      normStr(input.description, 4000),
      VALID_KINDS.has(kind) ? kind : 'challenge',
      normStr(input.govhubMessageId, 120) || null,
      normStr(input.govhubUrl, 500) || null,
      JSON.stringify(normalizeDpIds(input.dpIds)),
      Number.isFinite(Number(input.sortOrder)) ? Math.floor(Number(input.sortOrder)) : 0,
      Boolean(input.requiresAcceptance),
      input.active !== false,
      parseIso(input.availableFrom),
      parseIso(input.availableUntil),
      now,
    ],
  );

  const blueberry = await getBlueberry(id);
  return { ok: true as const, blueberry };
}

export async function updateBlueberry(id: string, input: Record<string, unknown>) {
  const existing = await getBlueberry(id);
  if (!existing) return { ok: false as const, error: 'not_found' };

  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const kind = input.kind != null ? normStr(input.kind, 32).toLowerCase() : existing.kind;

  await pool.query(
    `UPDATE dp_blueberry SET
       label = $2, description = $3, kind = $4, govhub_message_id = $5, govhub_url = $6,
       dp_ids = $7::jsonb, sort_order = $8, requires_acceptance = $9, active = $10,
       available_from = $11, available_until = $12, updated_at = now()
     WHERE id = $1`,
    [
      id,
      input.label != null ? normStr(input.label, 200) : existing.label,
      input.description != null ? normStr(input.description, 4000) : existing.description,
      VALID_KINDS.has(kind) ? kind : existing.kind,
      input.govhubMessageId != null ? normStr(input.govhubMessageId, 120) || null : existing.govhubMessageId,
      input.govhubUrl != null ? normStr(input.govhubUrl, 500) || null : existing.govhubUrl,
      JSON.stringify(input.dpIds != null ? normalizeDpIds(input.dpIds) : existing.dpIds),
      input.sortOrder != null ? Math.floor(Number(input.sortOrder) || 0) : existing.sortOrder,
      input.requiresAcceptance != null ? Boolean(input.requiresAcceptance) : existing.requiresAcceptance,
      input.active != null ? Boolean(input.active) : existing.active,
      input.availableFrom != null ? parseIso(input.availableFrom) : existing.availableFrom,
      input.availableUntil != null ? parseIso(input.availableUntil) : existing.availableUntil,
    ],
  );

  const blueberry = await getBlueberry(id);
  return { ok: true as const, blueberry };
}

export async function deleteBlueberry(id: string) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const res = await pool.query('DELETE FROM dp_blueberry WHERE id = $1 RETURNING id', [id]);
  if (!res.rowCount) return { ok: false as const, error: 'not_found' };
  return { ok: true as const, id };
}

export async function reorderBlueberries(ids: string[]) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };
  const list = Array.isArray(ids) ? ids.map((id) => String(id).trim()).filter(Boolean) : [];
  for (let i = 0; i < list.length; i += 1) {
    await pool.query('UPDATE dp_blueberry SET sort_order = $2, updated_at = now() WHERE id = $1', [
      list[i],
      i,
    ]);
  }
  const blueberries = await listBlueberries();
  return { ok: true as const, blueberries };
}

export function isBlueberryCurrentlyAvailable(blueberry: DpBlueberry, now = Date.now()) {
  if (!blueberry.active) return false;
  if (blueberry.availableFrom) {
    const start = Date.parse(blueberry.availableFrom);
    if (Number.isFinite(start) && now < start) return false;
  }
  if (blueberry.availableUntil) {
    const end = Date.parse(blueberry.availableUntil);
    if (Number.isFinite(end) && now > end) return false;
  }
  return true;
}

export async function publicBlueberriesPayload() {
  const settings = await getBlueberrySettings();
  const items = (await listBlueberries()).filter((b) => isBlueberryCurrentlyAvailable(b));
  return {
    available: settings.available,
    introText: settings.introText,
    unavailableMessage: settings.unavailableMessage,
    items,
  };
}
