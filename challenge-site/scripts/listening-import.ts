/**
 * Listening workspace: import or replay a meeting record (Phase 1).
 *
 *   npx tsx scripts/listening-import.ts --mode migrate-only
 *   npx tsx scripts/listening-import.ts --mode import                       # 16 Nov record, all at once (idempotent)
 *   npx tsx scripts/listening-import.ts --mode replay --speed 20            # demo occurrence, transcript in time order
 *   npx tsx scripts/listening-import.ts --mode check                        # validate the inputs, write nothing
 *
 * Options: --db <url> (default postgresql:///desirable_properties_staging?host=/var/run/postgresql, the box2 staging DB over the local socket;
 * no password file is read), --owner <role> (hand the tables to the app's database role, e.g. dp_staging on box2), --slug, --demo-slug, --speed N, --max-gap-ms N, --until HH:MM:SS, --rebuild-check,
 * --transcript <json>, --cards <json>.
 *
 * Transcript: the cleaned turns from ~/handoff/dp-2026-11-16-governance-review/build_transcript.py (held-back passages
 * removed, misheard names fixed), checked in as src/data/meta-governance-2026-11-16-transcript.json. --rebuild-check
 * reruns that script in a throwaway HOME and refuses if its output differs.
 * Cards: src/data/listening/2026-11-16-cards.json (from the meeting digest). Every card resolves to transcript
 * segments or carries a suggestion label; the tool refuses otherwise.
 * Refuses the production database (desirable_properties) and any input mentioning Vint Cerf.
 */
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync } from 'fs';
import os from 'os';
import path from 'path';
import pg from 'pg';
import { LISTENING_SCHEMA_SQL, PRODUCTION_DB_NAME } from '../src/lib/listening/schema';
import { cardRevIsGrounded, CARD_LABELS, CARD_TYPES, type CardLabel, type CardType, type SourceRef } from '../src/lib/listening/types';
import { stableId, withMeetingTx, type Actor } from '../src/lib/listening/store.server';
import { addSegment, addSpeaker, createCard, setPhase } from '../src/lib/listening/writes.server';

type Turn = { id: string; t: number; speaker: string; text: string };
type TranscriptFile = { source: string; duration: number; sections: { t: number; title: string }[]; turns: Turn[] };
type CardSpec = {
  key: string;
  type: CardType;
  label?: CardLabel;
  title: string;
  body?: string;
  sources?: 'auto' | string[];
  children?: CardSpec[];
};
type CardsFile = {
  meeting: {
    slug: string;
    title: string;
    startsAt: string;
    endsAt: string;
    sourceKey: string;
    canonicalPath: string;
    joinUrl: string;
    transcriptSource: string;
  };
  cards: CardSpec[];
};

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SITE = path.resolve(HERE, '..');

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : 'true';
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const mode = arg('mode', 'import')!;
const dbUrl = arg('db', 'postgresql:///desirable_properties_staging?host=/var/run/postgresql')!;
const transcriptPath = arg('transcript', path.join(SITE, 'src/data/meta-governance-2026-11-16-transcript.json'))!;
const cardsPath = arg('cards', path.join(SITE, 'src/data/listening/2026-11-16-cards.json'))!;
const speed = Number(arg('speed', '20'));
const maxGapMs = Number(arg('max-gap-ms', '4000'));

const IMPORT_ACTOR: Actor = { userId: null, name: 'Import tool (staging)', role: 'system' };

function die(msg: string): never {
  console.error(`listening-import: ${msg}`);
  process.exit(1);
}

const parseClock = (c: string) => {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/.exec(c.trim());
  if (!m) die(`bad timestamp "${c}"`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

/* ---------------- inputs ---------------- */

const transcript = JSON.parse(readFileSync(transcriptPath, 'utf8')) as TranscriptFile;
const cardsFile = JSON.parse(readFileSync(cardsPath, 'utf8')) as CardsFile;
const turns = [...transcript.turns].sort((a, b) => a.t - b.t);

function noVintCerf(text: string, where: string) {
  if (/\b(vint|cerf)\b/i.test(text)) die(`refusing: ${where} mentions Vint Cerf`);
}
for (const t of turns) noVintCerf(`${t.speaker} ${t.text}`, `turn ${t.id}`);

/** The turn a timestamp falls in: the last turn starting at or before it (same rule as the notes page). */
function turnAt(seconds: number): Turn | undefined {
  let found: Turn | undefined;
  for (const t of turns) {
    if (t.t <= seconds + 0.5) found = t;
    else break;
  }
  return found;
}

function resolveSources(spec: CardSpec): Turn[] {
  let stamps: string[] = [];
  if (spec.sources === 'auto') {
    const text = spec.body ?? '';
    const re = /(\d{2}:\d{2}:\d{2})(?:\s+(?:to|through)\s+(\d{2}:\d{2}:\d{2}))?/g;
    for (const m of text.matchAll(re)) stamps.push(m[2] ? `${m[1]}-${m[2]}` : m[1]);
  } else if (Array.isArray(spec.sources)) {
    stamps = spec.sources;
  }
  const out = new Map<string, Turn>();
  for (const s of stamps) {
    const [a, b] = s.split('-');
    const first = turnAt(parseClock(a));
    if (!first) die(`card ${spec.key}: timestamp ${a} is before the first turn`);
    out.set(first.id, first);
    if (b) {
      const end = parseClock(b);
      for (const t of turns) if (t.t > first.t && t.t <= end) out.set(t.id, t);
    }
  }
  return [...out.values()].sort((x, y) => x.t - y.t);
}

type Planned = { spec: CardSpec; parentKey: string | null; order: number; sources: Turn[] };
const planned: Planned[] = [];
function plan(list: CardSpec[], parentKey: string | null) {
  for (const spec of list) {
    if (!CARD_TYPES.includes(spec.type)) die(`card ${spec.key}: unknown type ${spec.type}`);
    if (spec.label && !CARD_LABELS.includes(spec.label)) die(`card ${spec.key}: unknown label ${spec.label}`);
    if (spec.label === 'council_decision') die(`card ${spec.key}: the import cannot record a council decision`);
    noVintCerf(`${spec.title} ${spec.body ?? ''}`, `card ${spec.key}`);
    const sources = resolveSources(spec);
    const grounded = cardRevIsGrounded({ sourceRefs: sources.map((t) => ({ type: 'segment', id: t.id })), label: spec.label ?? null });
    if (!grounded) die(`card ${spec.key} has no transcript source and no "Claude synthesis" / "Proposal added after the meeting" label`);
    planned.push({ spec, parentKey, order: planned.length, sources });
    if (spec.children) plan(spec.children, spec.key);
  }
}
plan(cardsFile.cards, null);

function rebuildCheck() {
  const script = path.join(os.homedir(), 'handoff/dp-2026-11-16-governance-review/build_transcript.py');
  const vtt = path.join(os.homedir(), 'repos/dp-meeting-digest/in/2026-11-16/transcript.vtt');
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'listening-rebuild-'));
  try {
    // A throwaway HOME: the script writes its held-back list under HOME, which must not touch the real one.
    mkdirSync(path.join(tmp, 'repos/dp-meeting-digest/in/2026-11-16'), { recursive: true });
    mkdirSync(path.join(tmp, 'handoff/dp-2026-11-16-governance-review'), { recursive: true });
    mkdirSync(path.join(tmp, 'root/challenge-site/src/data'), { recursive: true });
    symlinkSync(vtt, path.join(tmp, 'repos/dp-meeting-digest/in/2026-11-16/transcript.vtt'));
    const r = spawnSync('python3', ['-I', script, path.join(tmp, 'root')], { env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: tmp, NODE_ENV: 'production' }, encoding: 'utf8' });
    if (r.status !== 0) die(`build_transcript.py failed: ${r.stderr}`);
    const fresh = readFileSync(path.join(tmp, 'root/challenge-site/src/data/meta-governance-2026-11-16-transcript.json'), 'utf8');
    if (fresh !== readFileSync(transcriptPath, 'utf8')) die('the checked-in transcript differs from a fresh build_transcript.py run');
    console.log('rebuild check: checked-in transcript matches build_transcript.py output');
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/* ---------------- database ---------------- */

async function connect(): Promise<pg.Pool> {
  const pool = new pg.Pool({ connectionString: dbUrl, max: 2 });
  const { rows } = await pool.query('SELECT current_database() AS db');
  if (rows[0].db === PRODUCTION_DB_NAME) die('refusing to write to the production database');
  await pool.query(LISTENING_SCHEMA_SQL);
  const owner = arg('owner');
  if (owner) {
    if (!/^[a-z_][a-z0-9_]*$/.test(owner)) die('bad --owner');
    // The site runs as its own role and re-runs the (idempotent) schema on start, so it must own these objects.
    const t = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'dp_listen_%'");
    for (const r of t.rows) await pool.query(`ALTER TABLE ${r.tablename} OWNER TO ${owner}`);
    await pool.query(`ALTER FUNCTION dp_listen_append_only() OWNER TO ${owner}`);
    console.log(`tables owned by ${owner}`);
  }
  console.log(`database ${rows[0].db}: listening schema ready`);
  return pool;
}

async function ensureMeeting(pool: pg.Pool, slug: string, kind: 'occurrence' | 'demo', title: string): Promise<string> {
  const m = cardsFile.meeting;
  const id = stableId('mtg', slug);
  await pool.query(
    `INSERT INTO dp_listen_meeting (id, slug, title, kind, starts_at, ends_at, source_key, canonical_path, join_url, transcript_source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'listening-import')
     ON CONFLICT (slug) DO NOTHING`,
    [id, slug, title, kind, m.startsAt, m.endsAt, kind === 'demo' ? `demo:${m.sourceKey}` : m.sourceKey, kind === 'demo' ? null : m.canonicalPath, m.joinUrl, m.transcriptSource],
  );
  const { rows } = await pool.query('SELECT id FROM dp_listen_meeting WHERE slug = $1', [slug]);
  return String(rows[0].id);
}

function sectionAt(t: number): string | null {
  let s: string | null = null;
  for (const sec of transcript.sections) if (sec.t <= t) s = sec.title;
  return s;
}

async function insertTurn(pool: pg.Pool, meetingId: string, turn: Turn, i: number) {
  await withMeetingTx(
    meetingId,
    IMPORT_ACTOR,
    async (tx) => {
      const speakerId = stableId('spk', meetingId, turn.speaker);
      await addSpeaker(tx, speakerId, turn.speaker);
      const next = turns[i + 1];
      await addSegment(tx, IMPORT_ACTOR, {
        id: stableId('seg', meetingId, turn.id),
        sourceId: turn.id,
        speakerId,
        startMs: turn.t * 1000,
        endMs: (next ? next.t : transcript.duration) * 1000,
        section: sectionAt(turn.t),
        text: turn.text,
      });
    },
    pool,
  );
}

async function insertCard(pool: pg.Pool, meetingId: string, p: Planned) {
  const refs: SourceRef[] = p.sources.map((t) => ({ type: 'segment', id: stableId('seg', meetingId, t.id) }));
  await withMeetingTx(
    meetingId,
    IMPORT_ACTOR,
    (tx) =>
      createCard(tx, IMPORT_ACTOR, {
        id: stableId('card', meetingId, p.spec.key),
        importKey: p.spec.key,
        parentId: p.parentKey ? stableId('card', meetingId, p.parentKey) : null,
        cardType: p.spec.type,
        origin: 'import',
        sortOrder: p.order,
        title: p.spec.title,
        body: p.spec.body ?? '',
        label: p.spec.label ?? null,
        sourceRefs: refs,
        reason: 'Imported from the meeting digest (out/2026-11-16/digest.md)',
      }),
    pool,
  );
}

async function setMode(pool: pg.Pool, meetingId: string, transcriptMode: 'imported' | 'replaying') {
  await withMeetingTx(
    meetingId,
    IMPORT_ACTOR,
    async (tx) => {
      const r = await tx.client.query('SELECT transcript_mode FROM dp_listen_meeting WHERE id = $1', [meetingId]);
      if (r.rows[0].transcript_mode === transcriptMode) return;
      await tx.client.query('UPDATE dp_listen_meeting SET transcript_mode = $2 WHERE id = $1', [meetingId, transcriptMode]);
      await tx.emit({ kind: 'meeting.updated', entityType: 'meeting', entityId: meetingId, data: { meeting: { transcriptMode } } });
    },
    pool,
  );
}

async function phaseOnce(pool: pg.Pool, meetingId: string, to: 'live' | 'preparing_draft', note: string) {
  const { rows } = await pool.query('SELECT phase FROM dp_listen_meeting WHERE id = $1', [meetingId]);
  if (rows[0].phase === to) return;
  await withMeetingTx(meetingId, IMPORT_ACTOR, (tx) => setPhase(tx, IMPORT_ACTOR, to, note), pool);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`${turns.length} transcript turns, ${planned.length} cards (${planned.filter((p) => p.sources.length === 0).length} labelled as suggestions without a source)`);
  if (flag('rebuild-check')) rebuildCheck();
  if (mode === 'check') return;
  const pool = await connect();
  try {
    if (mode === 'migrate-only') return;

    if (mode === 'import') {
      const slug = arg('slug', cardsFile.meeting.slug)!;
      const meetingId = await ensureMeeting(pool, slug, 'occurrence', cardsFile.meeting.title);
      for (let i = 0; i < turns.length; i++) await insertTurn(pool, meetingId, turns[i], i);
      for (const p of planned) await insertCard(pool, meetingId, p);
      await setMode(pool, meetingId, 'imported');
      await phaseOnce(pool, meetingId, 'preparing_draft', 'Recorded by the import tool after the meeting. The live phase was not recorded in this workspace.');
      const { rows } = await pool.query('SELECT last_seq FROM dp_listen_meeting WHERE id = $1', [meetingId]);
      console.log(`imported ${slug}: record at seq ${rows[0].last_seq}`);
      return;
    }

    if (mode === 'replay') {
      const slug = arg('demo-slug', `${cardsFile.meeting.slug}-replay`)!;
      const until = arg('until') ? parseClock(arg('until')!) : Infinity;
      const meetingId = await ensureMeeting(pool, slug, 'demo', `${cardsFile.meeting.title} (replay demo)`);
      const have = await pool.query('SELECT count(*)::int AS n FROM dp_listen_segment WHERE meeting_id = $1', [meetingId]);
      if (have.rows[0].n > 0) die(`${slug} already has a transcript; use --demo-slug <new slug> for a fresh replay`);
      await phaseOnce(pool, meetingId, 'live', 'Replay demo started by the import tool.');
      await setMode(pool, meetingId, 'replaying');
      console.log(`replaying into /listening/${slug} at ${speed}x`);
      const created = new Set<string>();
      const flushCards = async (nowSec: number, final: boolean) => {
        for (const p of planned) {
          if (created.has(p.spec.key)) continue;
          if (p.parentKey && !created.has(p.parentKey)) continue;
          const last = p.sources.length ? p.sources[p.sources.length - 1].t : null;
          const ready = last !== null ? last <= nowSec : final || (p.spec.label !== 'added_after_meeting' && p.parentKey !== null);
          if (!ready) continue;
          await insertCard(pool, meetingId, p);
          created.add(p.spec.key);
        }
      };
      let prev = turns[0]?.t ?? 0;
      for (let i = 0; i < turns.length; i++) {
        const t = turns[i];
        if (t.t > until) break;
        await sleep(Math.min(maxGapMs, ((t.t - prev) * 1000) / Math.max(speed, 0.1)));
        prev = t.t;
        await insertTurn(pool, meetingId, t, i);
        await flushCards(t.t, false);
        if (i % 20 === 0) console.log(`  ${t.id} (${i + 1}/${turns.length})`);
      }
      if (until === Infinity) {
        await flushCards(Infinity, true);
        await setMode(pool, meetingId, 'imported');
        await phaseOnce(pool, meetingId, 'preparing_draft', 'Replay finished.');
      }
      console.log(`replay done: ${created.size} cards`);
      return;
    }
    die(`unknown --mode ${mode}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => die(err instanceof Error ? err.stack || err.message : String(err)));
