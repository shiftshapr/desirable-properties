import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ensureDpSchema } from '@/lib/dp-db';
import type {
  OnboardActor,
  OnboardEvent,
  OnboardSession,
} from '@/lib/hermes-onboard/types';
import { DEFAULT_CONSENT } from '@/lib/hermes-onboard/types';

const DATA_DIR = path.join(process.cwd(), 'data', 'hermes-onboard');

type FileRecord = {
  session: OnboardSession;
  events: OnboardEvent[];
};

function emptySession(slug: string): OnboardSession {
  return {
    slug,
    confirmed: {},
    consent: { ...DEFAULT_CONSENT },
    briefing: null,
    nextSteps: [],
    pinnedMoveIds: [],
    dismissedMoveIds: [],
    enabledPrimitives: null,
    claimedBy: null,
    communityThreadId: null,
    communityThreadTitle: null,
    updatedAt: new Date().toISOString(),
  };
}

function filePath(slug: string): string {
  return path.join(DATA_DIR, `${slug}.json`);
}

function readFileRecord(slug: string): FileRecord | null {
  try {
    const raw = fs.readFileSync(filePath(slug), 'utf8');
    const parsed = JSON.parse(raw) as FileRecord;
    if (!parsed?.session) return null;
    return {
      session: parsed.session,
      events: Array.isArray(parsed.events) ? parsed.events : [],
    };
  } catch {
    return null;
  }
}

function writeFileRecord(record: FileRecord): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(record.session.slug), `${JSON.stringify(record, null, 2)}\n`);
}

function rowToSession(row: Record<string, unknown>): OnboardSession {
  const claimed = row.claimed_by && typeof row.claimed_by === 'object'
    ? (row.claimed_by as OnboardSession['claimedBy'])
    : null;
  return {
    slug: String(row.slug),
    confirmed: (row.confirmed as OnboardSession['confirmed']) || {},
    consent: (row.consent as OnboardSession['consent']) || { ...DEFAULT_CONSENT },
    briefing: (row.briefing as OnboardSession['briefing']) || null,
    nextSteps: Array.isArray(row.next_steps) ? (row.next_steps as OnboardSession['nextSteps']) : [],
    pinnedMoveIds: Array.isArray(row.pinned_move_ids) ? (row.pinned_move_ids as string[]) : [],
    dismissedMoveIds: Array.isArray(row.dismissed_move_ids)
      ? (row.dismissed_move_ids as string[])
      : [],
    enabledPrimitives: Array.isArray(row.enabled_primitives)
      ? (row.enabled_primitives as string[])
      : null,
    claimedBy: claimed,
    communityThreadId: row.community_thread_id ? String(row.community_thread_id) : null,
    communityThreadTitle: row.community_thread_title ? String(row.community_thread_title) : null,
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
  };
}

export async function loadOnboardSession(slug: string): Promise<OnboardSession> {
  const pool = await ensureDpSchema();
  if (pool) {
    const result = await pool.query('SELECT * FROM hermes_onboard_session WHERE slug = $1', [slug]);
    if (result.rows[0]) return rowToSession(result.rows[0] as Record<string, unknown>);
    return emptySession(slug);
  }
  return readFileRecord(slug)?.session || emptySession(slug);
}

export async function saveOnboardSession(session: OnboardSession): Promise<OnboardSession> {
  const next = { ...session, updatedAt: new Date().toISOString() };
  const pool = await ensureDpSchema();
  if (pool) {
    await pool.query(
      `INSERT INTO hermes_onboard_session (
        slug, confirmed, consent, briefing, next_steps, pinned_move_ids, dismissed_move_ids,
        enabled_primitives, claimed_by, community_thread_id, community_thread_title, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (slug) DO UPDATE SET
        confirmed = EXCLUDED.confirmed,
        consent = EXCLUDED.consent,
        briefing = EXCLUDED.briefing,
        next_steps = EXCLUDED.next_steps,
        pinned_move_ids = EXCLUDED.pinned_move_ids,
        dismissed_move_ids = EXCLUDED.dismissed_move_ids,
        enabled_primitives = EXCLUDED.enabled_primitives,
        claimed_by = EXCLUDED.claimed_by,
        community_thread_id = EXCLUDED.community_thread_id,
        community_thread_title = EXCLUDED.community_thread_title,
        updated_at = EXCLUDED.updated_at`,
      [
        next.slug,
        next.confirmed,
        next.consent,
        next.briefing,
        next.nextSteps,
        next.pinnedMoveIds,
        next.dismissedMoveIds,
        next.enabledPrimitives,
        next.claimedBy,
        next.communityThreadId,
        next.communityThreadTitle,
        next.updatedAt,
      ],
    );
    return next;
  }
  const existing = readFileRecord(next.slug);
  writeFileRecord({ session: next, events: existing?.events || [] });
  return next;
}

export async function appendOnboardEvent(input: {
  slug: string;
  kind: string;
  actor: OnboardActor | null;
  payload?: Record<string, unknown>;
}): Promise<OnboardEvent> {
  const event: OnboardEvent = {
    id: randomUUID(),
    slug: input.slug,
    kind: input.kind,
    actor: input.actor,
    payload: input.payload || {},
    createdAt: new Date().toISOString(),
  };
  const pool = await ensureDpSchema();
  if (pool) {
    await pool.query(
      `INSERT INTO hermes_onboard_event (id, slug, kind, actor, payload, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        event.id,
        event.slug,
        event.kind,
        event.actor,
        event.payload,
        event.createdAt,
      ],
    );
    return event;
  }
  const existing = readFileRecord(input.slug) || { session: emptySession(input.slug), events: [] };
  existing.events.unshift(event);
  existing.events = existing.events.slice(0, 200);
  writeFileRecord(existing);
  return event;
}

export async function listOnboardEvents(slug: string, limit = 50): Promise<OnboardEvent[]> {
  const pool = await ensureDpSchema();
  if (pool) {
    const result = await pool.query(
      `SELECT id, slug, kind, actor, payload, created_at
       FROM hermes_onboard_event WHERE slug = $1
       ORDER BY created_at DESC LIMIT $2`,
      [slug, limit],
    );
    return result.rows.map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      kind: String(row.kind),
      actor: row.actor || null,
      payload: row.payload || {},
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }
  return (readFileRecord(slug)?.events || []).slice(0, limit);
}

export function actorFromSession(session: {
  userId: string;
  email?: string | null;
  displayName?: string | null;
} | null): OnboardActor | null {
  if (!session) return null;
  return {
    userId: session.userId,
    email: session.email || null,
    displayName: session.displayName || null,
  };
}
