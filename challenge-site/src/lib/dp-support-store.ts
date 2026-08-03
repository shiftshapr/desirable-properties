import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import type {
  CreateTicketInput,
  SupportAgentNote,
  SupportCategory,
  SupportDraftReply,
  SupportNoteKind,
  SupportScreenshotInput,
  SupportStatus,
  SupportTicket,
  SupportUrgency,
} from '@/lib/support-store';

const VALID_URGENCY = new Set<SupportUrgency>(['critical', 'blocking', 'non_blocking']);
const VALID_CATEGORY = new Set<SupportCategory>([
  'challenge_question',
  'workgroup_help',
  'technical_support',
  'content_clarification',
  'general',
]);
const VALID_NOTE_KIND = new Set<SupportNoteKind>(['investigation', 'draft_reply', 'system', 'reply_sent']);
const VALID_STATUS = new Set<SupportStatus>(['open', 'triaged', 'closed']);
const URGENCY_RANK: Record<SupportUrgency, number> = {
  critical: 0,
  blocking: 1,
  non_blocking: 2,
};

let importDone: Promise<void> | null = null;

function normStr(value: unknown, max = 8000) {
  return String(value ?? '').trim().slice(0, max);
}

function emptyDraftReply(): SupportDraftReply {
  return { subject: '', body: '', createdAt: null, updatedAt: null, sentAt: null, sentBy: null };
}

function normalizeTicket(ticket: SupportTicket): SupportTicket {
  if (!ticket.agentNotes) ticket.agentNotes = [];
  if (!ticket.draftReply) ticket.draftReply = emptyDraftReply();
  if (ticket.escalatedToHuman == null) ticket.escalatedToHuman = ticket.urgency === 'critical';
  if (ticket.proposedResolution == null) ticket.proposedResolution = null;
  if (ticket.resolution == null) ticket.resolution = null;
  return ticket;
}

function rowToTicket(row: Record<string, unknown>): SupportTicket {
  const draftRaw =
    row.draft_reply && typeof row.draft_reply === 'object'
      ? (row.draft_reply as SupportDraftReply)
      : emptyDraftReply();

  return normalizeTicket({
    id: String(row.id),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    status: String(row.status || 'open') as SupportStatus,
    subject: String(row.subject || ''),
    body: String(row.body || ''),
    urgency: String(row.urgency || 'non_blocking') as SupportUrgency,
    category: String(row.category || 'general') as SupportCategory,
    screenshotAcknowledged: Boolean(row.screenshot_acknowledged),
    userId: row.user_id ? String(row.user_id) : null,
    email: row.email ? String(row.email) : null,
    handle: row.handle ? String(row.handle) : null,
    pageUrl: row.page_url ? String(row.page_url) : null,
    browser: row.browser ? String(row.browser) : null,
    os: row.os ? String(row.os) : null,
    canopiMode: row.canopi_mode ? String(row.canopi_mode) : null,
    stepsToReproduce: row.steps_to_reproduce ? String(row.steps_to_reproduce) : null,
    expectedBehavior: row.expected_behavior ? String(row.expected_behavior) : null,
    actualBehavior: row.actual_behavior ? String(row.actual_behavior) : null,
    triedAlready: row.tried_already ? String(row.tried_already) : null,
    diagnosticBundle:
      row.diagnostic_bundle && typeof row.diagnostic_bundle === 'object'
        ? (row.diagnostic_bundle as Record<string, unknown>)
        : null,
    attachments: Array.isArray(row.attachments) ? (row.attachments as SupportTicket['attachments']) : [],
    hasScreenshots: Boolean(row.has_screenshots),
    relatedTicketIds: Array.isArray(row.related_ticket_ids)
      ? (row.related_ticket_ids as string[])
      : [],
    source: 'dp_challenge',
    agentNotes: Array.isArray(row.agent_notes) ? (row.agent_notes as SupportAgentNote[]) : [],
    draftReply: {
      subject: String(draftRaw.subject || ''),
      body: String(draftRaw.body || ''),
      createdAt: draftRaw.createdAt ? String(draftRaw.createdAt) : null,
      updatedAt: draftRaw.updatedAt ? String(draftRaw.updatedAt) : null,
      sentAt: draftRaw.sentAt ? String(draftRaw.sentAt) : null,
      sentBy: draftRaw.sentBy ? String(draftRaw.sentBy) : null,
    },
    proposedResolution: row.proposed_resolution ? String(row.proposed_resolution) : null,
    resolution: row.resolution ? String(row.resolution) : null,
    escalatedToHuman: Boolean(row.escalated_to_human),
  });
}

function ticketToRow(ticket: SupportTicket) {
  return [
    ticket.id,
    ticket.createdAt,
    ticket.updatedAt,
    ticket.status,
    ticket.subject,
    ticket.body,
    ticket.urgency,
    ticket.category,
    ticket.screenshotAcknowledged,
    ticket.userId,
    ticket.email,
    ticket.handle,
    ticket.pageUrl,
    ticket.browser,
    ticket.os,
    ticket.canopiMode,
    ticket.stepsToReproduce,
    ticket.expectedBehavior,
    ticket.actualBehavior,
    ticket.triedAlready,
    ticket.diagnosticBundle ? JSON.stringify(ticket.diagnosticBundle) : null,
    JSON.stringify(ticket.attachments || []),
    ticket.hasScreenshots,
    JSON.stringify(ticket.relatedTicketIds || []),
    ticket.source,
    JSON.stringify(ticket.agentNotes || []),
    JSON.stringify(ticket.draftReply || emptyDraftReply()),
    ticket.proposedResolution,
    ticket.resolution,
    ticket.escalatedToHuman,
  ];
}

const INSERT_SQL = `
INSERT INTO dp_support_ticket (
  id, created_at, updated_at, status, subject, body, urgency, category,
  screenshot_acknowledged, user_id, email, handle, page_url, browser, os,
  canopi_mode, steps_to_reproduce, expected_behavior, actual_behavior,
  tried_already, diagnostic_bundle, attachments, has_screenshots,
  related_ticket_ids, source, agent_notes, draft_reply, proposed_resolution,
  resolution, escalated_to_human
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
  $21::jsonb,$22::jsonb,$23,$24::jsonb,$25,$26::jsonb,$27::jsonb,$28,$29,$30
) ON CONFLICT (id) DO NOTHING`;

function ticketsDir(dataDir: string) {
  return path.join(dataDir, 'support-tickets');
}

/** One-time import of legacy JSON tickets into Postgres. */
export async function importSupportTicketsFromJson(dataDir: string) {
  if (!isDpDatabaseConfigured()) return { imported: 0, skipped: 0 };

  const pool = await ensureDpSchema();
  if (!pool) return { imported: 0, skipped: 0 };

  const dir = ticketsDir(dataDir);
  if (!fs.existsSync(dir)) return { imported: 0, skipped: 0 };

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const fp = path.join(dir, file);
    let ticket: SupportTicket;
    try {
      ticket = normalizeTicket(JSON.parse(fs.readFileSync(fp, 'utf8')) as SupportTicket);
    } catch {
      skipped += 1;
      continue;
    }

    const exists = await pool.query('SELECT id FROM dp_support_ticket WHERE id = $1', [ticket.id]);
    if (exists.rowCount) {
      skipped += 1;
      continue;
    }

    await pool.query(INSERT_SQL, ticketToRow(ticket));
    imported += 1;
  }

  return { imported, skipped };
}

async function ensureImported(dataDir: string) {
  if (!importDone) {
    importDone = importSupportTicketsFromJson(dataDir).then(() => undefined);
  }
  await importDone;
}

function sortTickets(rows: SupportTicket[]) {
  return [...rows].sort((a, b) => {
    const ra = URGENCY_RANK[a.urgency] ?? 9;
    const rb = URGENCY_RANK[b.urgency] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export async function pgReadTicket(dataDir: string, id: string): Promise<SupportTicket | null> {
  await ensureImported(dataDir);
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_support_ticket WHERE id = $1', [id]);
  return res.rows[0] ? rowToTicket(res.rows[0]) : null;
}

export async function pgListTickets(dataDir: string): Promise<SupportTicket[]> {
  await ensureImported(dataDir);
  const pool = await ensureDpSchema();
  if (!pool) return [];
  const res = await pool.query('SELECT * FROM dp_support_ticket');
  return sortTickets(res.rows.map(rowToTicket));
}

export async function pgWriteTicket(dataDir: string, ticket: SupportTicket) {
  await ensureImported(dataDir);
  const pool = await ensureDpSchema();
  if (!pool) return null;

  ticket.updatedAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO dp_support_ticket (
       id, created_at, updated_at, status, subject, body, urgency, category,
       screenshot_acknowledged, user_id, email, handle, page_url, browser, os,
       canopi_mode, steps_to_reproduce, expected_behavior, actual_behavior,
       tried_already, diagnostic_bundle, attachments, has_screenshots,
       related_ticket_ids, source, agent_notes, draft_reply, proposed_resolution,
       resolution, escalated_to_human
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
       $21::jsonb,$22::jsonb,$23,$24::jsonb,$25,$26::jsonb,$27::jsonb,$28,$29,$30
     )
     ON CONFLICT (id) DO UPDATE SET
       updated_at = EXCLUDED.updated_at,
       status = EXCLUDED.status,
       subject = EXCLUDED.subject,
       body = EXCLUDED.body,
       urgency = EXCLUDED.urgency,
       category = EXCLUDED.category,
       screenshot_acknowledged = EXCLUDED.screenshot_acknowledged,
       user_id = EXCLUDED.user_id,
       email = EXCLUDED.email,
       handle = EXCLUDED.handle,
       page_url = EXCLUDED.page_url,
       browser = EXCLUDED.browser,
       os = EXCLUDED.os,
       canopi_mode = EXCLUDED.canopi_mode,
       steps_to_reproduce = EXCLUDED.steps_to_reproduce,
       expected_behavior = EXCLUDED.expected_behavior,
       actual_behavior = EXCLUDED.actual_behavior,
       tried_already = EXCLUDED.tried_already,
       diagnostic_bundle = EXCLUDED.diagnostic_bundle,
       attachments = EXCLUDED.attachments,
       has_screenshots = EXCLUDED.has_screenshots,
       related_ticket_ids = EXCLUDED.related_ticket_ids,
       agent_notes = EXCLUDED.agent_notes,
       draft_reply = EXCLUDED.draft_reply,
       proposed_resolution = EXCLUDED.proposed_resolution,
       resolution = EXCLUDED.resolution,
       escalated_to_human = EXCLUDED.escalated_to_human`,
    ticketToRow(ticket),
  );
  return ticket;
}

async function findRecentDuplicatesPg(dataDir: string, userId: string | null, subject: string, hours = 24) {
  if (!userId) return [] as string[];
  const rows = await pgListTickets(dataDir);
  const cutoff = Date.now() - hours * 3600 * 1000;
  const subj = normStr(subject, 200).toLowerCase();
  return rows
    .filter((t) => {
      if (t.userId !== userId) return false;
      const created = new Date(t.createdAt).getTime();
      if (!Number.isFinite(created) || created < cutoff) return false;
      const other = normStr(t.subject, 200).toLowerCase();
      return other === subj || other.includes(subj) || subj.includes(other);
    })
    .map((t) => t.id);
}

export async function pgCreateTicket(
  dataDir: string,
  input: CreateTicketInput,
  attachments: SupportTicket['attachments'],
  hasScreenshots: boolean,
) {
  const urgency = normStr(input.urgency, 32).toLowerCase() as SupportUrgency;
  const category = normStr(input.category, 64).toLowerCase() as SupportCategory;
  if (!VALID_URGENCY.has(urgency)) return { ok: false as const, error: 'invalid_urgency' };
  if (!VALID_CATEGORY.has(category)) return { ok: false as const, error: 'invalid_category' };

  const subject = normStr(input.subject, 200);
  const body = normStr(input.body, 8000);
  if (!subject) return { ok: false as const, error: 'subject_required' };
  if (!body) return { ok: false as const, error: 'body_required' };

  const id = normStr(input.ticketId, 64) || crypto.randomUUID();
  const now = new Date().toISOString();
  const userId = normStr(input.userId, 128) || null;
  const duplicates = await findRecentDuplicatesPg(dataDir, userId, subject);

  const ticket = normalizeTicket({
    id,
    createdAt: now,
    updatedAt: now,
    status: 'open',
    subject,
    body,
    urgency,
    category,
    screenshotAcknowledged: Boolean(input.screenshotAcknowledged),
    userId,
    email: normStr(input.email, 200).toLowerCase() || null,
    handle: normStr(input.handle, 80) || null,
    pageUrl: normStr(input.pageUrl, 500) || null,
    browser: normStr(input.browser, 200) || null,
    os: normStr(input.os, 120) || null,
    canopiMode: normStr(input.canopiMode, 64) || null,
    stepsToReproduce: normStr(input.stepsToReproduce, 4000) || null,
    expectedBehavior: normStr(input.expectedBehavior, 1000) || null,
    actualBehavior: normStr(input.actualBehavior, 1000) || null,
    triedAlready: normStr(input.triedAlready, 4000) || null,
    diagnosticBundle:
      input.diagnosticBundle && typeof input.diagnosticBundle === 'object'
        ? input.diagnosticBundle
        : null,
    attachments,
    hasScreenshots,
    relatedTicketIds: duplicates.filter((tid) => tid !== id),
    source: 'dp_challenge',
    agentNotes: [],
    draftReply: emptyDraftReply(),
    proposedResolution: null,
    resolution: null,
    escalatedToHuman: urgency === 'critical',
  });

  await pgWriteTicket(dataDir, ticket);
  return { ok: true as const, ticket };
}

export async function pgSearchTickets(
  dataDir: string,
  filters: {
    q?: string;
    urgency?: string;
    category?: string;
    status?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const q = normStr(filters.q, 200).toLowerCase();
  const urgency = normStr(filters.urgency, 32).toLowerCase() as SupportUrgency;
  const category = normStr(filters.category, 64).toLowerCase() as SupportCategory;
  const status = normStr(filters.status, 32).toLowerCase() as SupportStatus;
  const userId = normStr(filters.userId, 128);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
  const offset = Math.max(0, Number(filters.offset) || 0);

  let rows = await pgListTickets(dataDir);
  if (urgency && VALID_URGENCY.has(urgency)) rows = rows.filter((t) => t.urgency === urgency);
  if (category && VALID_CATEGORY.has(category)) rows = rows.filter((t) => t.category === category);
  if (status && VALID_STATUS.has(status)) rows = rows.filter((t) => t.status === status);
  if (userId) rows = rows.filter((t) => t.userId === userId);
  if (q) {
    rows = rows.filter((t) => {
      const hay = [t.id, t.subject, t.body, t.email, t.handle, t.userId, t.category, t.urgency, t.pageUrl]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return {
    total: rows.length,
    offset,
    limit,
    tickets: rows.slice(offset, offset + limit),
  };
}

export async function pgPatchTicket(
  dataDir: string,
  id: string,
  patch: {
    status?: string;
    proposedResolution?: string | null;
    resolution?: string | null;
    escalatedToHuman?: boolean;
    draftReply?: { subject?: string; body?: string };
    note?: { kind?: SupportNoteKind; text?: string; author?: string };
  },
) {
  const ticket = await pgReadTicket(dataDir, id);
  if (!ticket) return { ok: false as const, error: 'not_found' };

  if (patch.status != null) {
    const next = normStr(patch.status, 32).toLowerCase() as SupportStatus;
    if (!VALID_STATUS.has(next)) return { ok: false as const, error: 'invalid_status' };
    ticket.status = next;
  }
  if (patch.proposedResolution != null) {
    ticket.proposedResolution = normStr(patch.proposedResolution, 4000) || null;
  }
  if (patch.resolution != null) {
    ticket.resolution = normStr(patch.resolution, 4000) || null;
  }
  if (patch.escalatedToHuman != null) {
    ticket.escalatedToHuman = Boolean(patch.escalatedToHuman);
  }
  if (patch.draftReply && typeof patch.draftReply === 'object') {
    const now = new Date().toISOString();
    if (patch.draftReply.subject != null) {
      ticket.draftReply.subject = normStr(patch.draftReply.subject, 200);
    }
    if (patch.draftReply.body != null) {
      ticket.draftReply.body = normStr(patch.draftReply.body, 8000);
    }
    ticket.draftReply.updatedAt = now;
    if (!ticket.draftReply.createdAt) ticket.draftReply.createdAt = now;
  }
  if (patch.note) {
    const kind = patch.note.kind && VALID_NOTE_KIND.has(patch.note.kind) ? patch.note.kind : 'investigation';
    const text = normStr(patch.note.text, 8000);
    if (!text) return { ok: false as const, error: 'note_text_required' };
    ticket.agentNotes.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      author: normStr(patch.note.author, 80) || 'hermes',
      kind,
      text,
    });
  }

  await pgWriteTicket(dataDir, ticket);
  return { ok: true as const, ticket };
}

export async function pgMarkDraftReplySent(dataDir: string, id: string, sentBy: string) {
  const ticket = await pgReadTicket(dataDir, id);
  if (!ticket) return { ok: false as const, error: 'not_found' };
  const now = new Date().toISOString();
  ticket.draftReply.sentAt = now;
  ticket.draftReply.sentBy = normStr(sentBy, 80) || 'admin';
  ticket.agentNotes.push({
    id: crypto.randomUUID(),
    at: now,
    author: normStr(sentBy, 80) || 'admin',
    kind: 'reply_sent',
    text: `Reply sent to ${ticket.email || 'unknown'}: ${ticket.draftReply.subject}`,
  });
  if (ticket.status === 'open') ticket.status = 'triaged';
  await pgWriteTicket(dataDir, ticket);
  return { ok: true as const, ticket };
}

export function pgEnabled() {
  return isDpDatabaseConfigured();
}
