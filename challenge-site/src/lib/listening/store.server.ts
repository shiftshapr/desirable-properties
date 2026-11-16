import { createHash, randomUUID } from 'crypto';
import type pg from 'pg';
import { getDpPool } from '@/lib/dp-db';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { LISTENING_SCHEMA_SQL } from '@/lib/listening/schema';
import type {
  Card,
  CardRev,
  Contribution,
  Meeting,
  Moderation,
  PhaseChange,
  Segment,
  SegmentRev,
  Speaker,
  WorkspaceEvent,
} from '@/lib/listening/types';

let schemaReady: Promise<void> | null = null;

/** The meeting-record pool. Refuses (and runs no SQL) when the flag is off. */
export async function listeningPool(): Promise<pg.Pool> {
  if (!listeningWorkspaceEnabled()) throw new Error('listening workspace is disabled');
  const pool = getDpPool();
  if (!pool) throw new Error('DP database is not configured');
  if (!schemaReady) {
    schemaReady = pool.query(LISTENING_SCHEMA_SQL).then(() => undefined);
    schemaReady.catch(() => {
      schemaReady = null;
    });
  }
  await schemaReady;
  return pool;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
}

/** Deterministic id for imported rows, so a re-run inserts nothing twice. */
export function stableId(prefix: string, ...parts: string[]): string {
  return `${prefix}_${createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 20)}`;
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: unknown): string | null => (v == null ? null : iso(v));

/* ---------------- row mappers ---------------- */

type Row = Record<string, unknown>;

export function mapMeeting(r: Row): Meeting {
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    kind: r.kind === 'demo' ? 'demo' : 'occurrence',
    startsAt: isoOrNull(r.starts_at),
    endsAt: isoOrNull(r.ends_at),
    canonicalPath: (r.canonical_path as string) ?? null,
    joinUrl: (r.join_url as string) ?? null,
    phase: r.phase as Meeting['phase'],
    transcriptMode: r.transcript_mode as Meeting['transcriptMode'],
    transcriptSource: (r.transcript_source as string) ?? null,
  };
}

export function mapSpeaker(r: Row): Speaker {
  return {
    id: String(r.id),
    zoomDisplayName: String(r.zoom_display_name),
    attributionStatus: r.attribution_status === 'confirmed' ? 'confirmed' : 'unresolved',
  };
}

export function mapSegmentRev(r: Row): SegmentRev {
  return {
    rev: Number(r.rev),
    text: String(r.text),
    kind: r.kind === 'correction' ? 'correction' : 'original',
    correctionId: (r.correction_id as string) ?? null,
    actorName: (r.actor_name as string) ?? null,
    createdAt: iso(r.created_at),
  };
}

export function mapCardRev(r: Row): CardRev {
  return {
    rev: Number(r.rev),
    title: String(r.title),
    body: String(r.body ?? ''),
    label: (r.label as CardRev['label']) ?? null,
    sourceRefs: Array.isArray(r.source_refs) ? (r.source_refs as CardRev['sourceRefs']) : [],
    status: r.status === 'withdrawn' ? 'withdrawn' : 'active',
    reason: (r.reason as string) ?? null,
    actorName: (r.actor_name as string) ?? null,
    actorRole: (r.actor_role as string) ?? null,
    createdAt: iso(r.created_at),
  };
}

export function mapContribution(r: Row): Contribution {
  return {
    id: String(r.id),
    authorUserId: String(r.author_user_id),
    authorName: String(r.author_name ?? ''),
    kind: r.kind as Contribution['kind'],
    targetType: r.target_type as Contribution['targetType'],
    targetId: (r.target_id as string) ?? null,
    body: String(r.body),
    proposedText: (r.proposed_text as string) ?? null,
    timing: r.timing as Contribution['timing'],
    createdAt: iso(r.created_at),
  };
}

export function mapModeration(r: Row): Moderation {
  return {
    id: String(r.id),
    contributionId: String(r.contribution_id),
    action: r.action as Moderation['action'],
    relatedId: (r.related_id as string) ?? null,
    note: (r.note as string) ?? null,
    actorName: (r.actor_name as string) ?? null,
    createdAt: iso(r.created_at),
  };
}

/* ---------------- reads ---------------- */

export async function getMeetingBySlug(slug: string): Promise<Meeting | null> {
  const pool = await listeningPool();
  const { rows } = await pool.query('SELECT * FROM dp_listen_meeting WHERE slug = $1', [slug]);
  return rows[0] ? mapMeeting(rows[0]) : null;
}

export async function getMeetingIdBySlug(slug: string): Promise<{ id: string; lastSeq: number } | null> {
  const pool = await listeningPool();
  const { rows } = await pool.query('SELECT id, last_seq FROM dp_listen_meeting WHERE slug = $1', [slug]);
  return rows[0] ? { id: String(rows[0].id), lastSeq: Number(rows[0].last_seq) } : null;
}

export type RecordSnapshot = {
  meeting: Meeting;
  cursor: number;
  speakers: Speaker[];
  segments: Segment[];
  cards: Card[];
  contributions: Contribution[];
  moderation: Moderation[];
  phaseHistory: PhaseChange[];
};

/** Everything on the page, read in one repeatable-read transaction so the cursor matches the data. */
export async function readSnapshot(slug: string): Promise<RecordSnapshot | null> {
  const pool = await listeningPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const m = await client.query('SELECT * FROM dp_listen_meeting WHERE slug = $1', [slug]);
    if (!m.rows[0]) {
      await client.query('COMMIT');
      return null;
    }
    const meeting = mapMeeting(m.rows[0]);
    const id = meeting.id;
    const [speakers, segs, segRevs, cards, cardRevs, ctbs, mods, phases] = [
      await client.query('SELECT * FROM dp_listen_speaker WHERE meeting_id = $1 ORDER BY created_at, id', [id]),
      await client.query('SELECT * FROM dp_listen_segment WHERE meeting_id = $1 ORDER BY start_ms, id', [id]),
      await client.query(
        `SELECT r.* FROM dp_listen_segment_rev r JOIN dp_listen_segment s ON s.id = r.segment_id
         WHERE s.meeting_id = $1 ORDER BY r.segment_id, r.rev`,
        [id],
      ),
      await client.query('SELECT * FROM dp_listen_card WHERE meeting_id = $1 ORDER BY sort_order, created_at, id', [id]),
      await client.query(
        `SELECT r.* FROM dp_listen_card_rev r JOIN dp_listen_card c ON c.id = r.card_id
         WHERE c.meeting_id = $1 ORDER BY r.card_id, r.rev`,
        [id],
      ),
      await client.query('SELECT * FROM dp_listen_contribution WHERE meeting_id = $1 ORDER BY created_at, id', [id]),
      await client.query('SELECT * FROM dp_listen_moderation WHERE meeting_id = $1 ORDER BY created_at, id', [id]),
      await client.query(
        `SELECT seq, data, actor_name, actor_role, created_at FROM dp_listen_event
         WHERE meeting_id = $1 AND kind = 'phase.changed' ORDER BY seq`,
        [id],
      ),
    ];
    await client.query('COMMIT');

    const segRevMap = new Map<string, SegmentRev[]>();
    for (const r of segRevs.rows) {
      const list = segRevMap.get(r.segment_id) ?? [];
      list.push(mapSegmentRev(r));
      segRevMap.set(r.segment_id, list);
    }
    const cardRevMap = new Map<string, CardRev[]>();
    for (const r of cardRevs.rows) {
      const list = cardRevMap.get(r.card_id) ?? [];
      list.push(mapCardRev(r));
      cardRevMap.set(r.card_id, list);
    }
    return {
      meeting,
      cursor: Number(m.rows[0].last_seq),
      speakers: speakers.rows.map(mapSpeaker),
      segments: segs.rows.map((r) => ({
        id: String(r.id),
        sourceId: String(r.source_id),
        speakerId: (r.speaker_id as string) ?? null,
        startMs: Number(r.start_ms),
        endMs: r.end_ms == null ? null : Number(r.end_ms),
        section: (r.section_title as string) ?? null,
        currentRev: Number(r.current_rev),
        revs: segRevMap.get(r.id) ?? [],
      })),
      cards: cards.rows.map((r) => ({
        id: String(r.id),
        parentId: (r.parent_id as string) ?? null,
        cardType: r.card_type as Card['cardType'],
        origin: r.origin as Card['origin'],
        sortOrder: Number(r.sort_order),
        currentRev: Number(r.current_rev),
        createdAt: iso(r.created_at),
        revs: cardRevMap.get(r.id) ?? [],
      })),
      contributions: ctbs.rows.map(mapContribution),
      moderation: mods.rows.map(mapModeration),
      phaseHistory: phases.rows.map((r) => ({
        seq: Number(r.seq),
        from: (r.data?.change?.from as PhaseChange['from']) ?? null,
        to: r.data?.change?.to as PhaseChange['to'],
        note: (r.data?.change?.note as string) ?? null,
        actorName: (r.actor_name as string) ?? null,
        actorRole: (r.actor_role as string) ?? null,
        createdAt: iso(r.created_at),
      })),
    };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Events after `cursor`, oldest first (stream replay). */
export async function readEventsAfter(
  meetingId: string,
  cursor: number,
  limit = 500,
): Promise<WorkspaceEvent[]> {
  const pool = await listeningPool();
  const { rows } = await pool.query(
    'SELECT seq, data FROM dp_listen_event WHERE meeting_id = $1 AND seq > $2 ORDER BY seq LIMIT $3',
    [meetingId, cursor, limit],
  );
  return rows.map((r) => ({ ...(r.data as object), seq: Number(r.seq) }) as WorkspaceEvent);
}

/* ---------------- writes ---------------- */

export type Actor = { userId: string | null; name: string | null; role: string | null };

type EventDraft = { kind: WorkspaceEvent['kind']; entityType: string; entityId: string; data: Record<string, unknown> };

export type MeetingTx = {
  client: pg.PoolClient;
  meetingId: string;
  /** Append one event; returns its seq. `data` is the stream payload (without seq). */
  emit: (draft: EventDraft) => Promise<number>;
};

/**
 * Write for one meeting in one transaction. The meeting row is locked, so events are numbered
 * last_seq + 1, gapless and in commit order. Listeners are notified on commit.
 */
export async function withMeetingTx<T>(
  meetingId: string,
  actor: Actor,
  fn: (tx: MeetingTx) => Promise<T>,
  pool?: pg.Pool,
): Promise<T> {
  const p = pool ?? (await listeningPool());
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const locked = await client.query('SELECT last_seq FROM dp_listen_meeting WHERE id = $1 FOR UPDATE', [meetingId]);
    if (!locked.rows[0]) throw new Error('meeting not found');
    let seq = Number(locked.rows[0].last_seq);
    const startSeq = seq;
    const tx: MeetingTx = {
      client,
      meetingId,
      emit: async (draft) => {
        seq += 1;
        await client.query(
          `INSERT INTO dp_listen_event (meeting_id, seq, kind, entity_type, entity_id, actor_user_id, actor_name, actor_role, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            meetingId,
            seq,
            draft.kind,
            draft.entityType,
            draft.entityId,
            actor.userId,
            actor.name,
            actor.role,
            JSON.stringify({ kind: draft.kind, ...draft.data }),
          ],
        );
        return seq;
      },
    };
    const result = await fn(tx);
    if (seq !== startSeq) {
      await client.query('UPDATE dp_listen_meeting SET last_seq = $2 WHERE id = $1', [meetingId, seq]);
      await client.query("SELECT pg_notify('dp_listen', $1)", [meetingId]);
    }
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function readCardForTx(client: pg.PoolClient, meetingId: string, cardId: string): Promise<Card | null> {
  const c = await client.query('SELECT * FROM dp_listen_card WHERE id = $1 AND meeting_id = $2', [cardId, meetingId]);
  if (!c.rows[0]) return null;
  const revs = await client.query('SELECT * FROM dp_listen_card_rev WHERE card_id = $1 ORDER BY rev', [cardId]);
  const r = c.rows[0];
  return {
    id: String(r.id),
    parentId: (r.parent_id as string) ?? null,
    cardType: r.card_type,
    origin: r.origin,
    sortOrder: Number(r.sort_order),
    currentRev: Number(r.current_rev),
    createdAt: iso(r.created_at),
    revs: revs.rows.map(mapCardRev),
  };
}
