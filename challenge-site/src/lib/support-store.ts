import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  pgCreateTicket,
  pgEnabled,
  pgMarkDraftReplySent,
  pgPatchTicket,
  pgReadTicket,
  pgSearchTickets,
} from '@/lib/dp-support-store';

export const SUPPORT_CATEGORIES = [
  'challenge_question',
  'workgroup_help',
  'technical_support',
  'content_clarification',
  'general',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportUrgency = 'critical' | 'blocking' | 'non_blocking';
export type SupportStatus = 'open' | 'triaged' | 'closed';
export type SupportNoteKind = 'investigation' | 'draft_reply' | 'system' | 'reply_sent';

export interface SupportAgentNote {
  id: string;
  at: string;
  author: string;
  kind: SupportNoteKind;
  text: string;
}

export interface SupportDraftReply {
  subject: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
  sentAt: string | null;
  sentBy: string | null;
}

export interface SupportScreenshotInput {
  filename?: string;
  mimeType?: string;
  dataBase64?: string;
}

export interface SupportTicket {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: SupportStatus;
  subject: string;
  body: string;
  urgency: SupportUrgency;
  category: SupportCategory;
  screenshotAcknowledged: boolean;
  userId: string | null;
  email: string | null;
  handle: string | null;
  pageUrl: string | null;
  browser: string | null;
  os: string | null;
  canopiMode: string | null;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  triedAlready: string | null;
  diagnosticBundle: Record<string, unknown> | null;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    path: string;
  }>;
  hasScreenshots: boolean;
  relatedTicketIds: string[];
  source: 'dp_challenge';
  agentNotes: SupportAgentNote[];
  draftReply: SupportDraftReply;
  proposedResolution: string | null;
  resolution: string | null;
  escalatedToHuman: boolean;
  blueberryAward?: {
    blueberryId: string;
    awardedAt: string;
    awardedBy: string;
  } | null;
}

const VALID_URGENCY = new Set<SupportUrgency>(['critical', 'blocking', 'non_blocking']);
const VALID_CATEGORY = new Set<SupportCategory>(SUPPORT_CATEGORIES);
const VALID_NOTE_KIND = new Set<SupportNoteKind>(['investigation', 'draft_reply', 'system', 'reply_sent']);
const VALID_STATUS = new Set<SupportStatus>(['open', 'triaged', 'closed']);
const URGENCY_RANK: Record<SupportUrgency, number> = {
  critical: 0,
  blocking: 1,
  non_blocking: 2,
};

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

function normStr(value: unknown, max = 8000) {
  return String(value ?? '').trim().slice(0, max);
}

function ticketsDir(dataDir: string) {
  return path.join(dataDir, 'support-tickets');
}

function attachmentsRoot(dataDir: string) {
  return path.join(ticketsDir(dataDir), 'attachments');
}

function ticketPath(dataDir: string, id: string) {
  return path.join(ticketsDir(dataDir), `${id}.json`);
}

function ensureDirs(dataDir: string) {
  fs.mkdirSync(attachmentsRoot(dataDir), { recursive: true });
}

function sortTickets(rows: SupportTicket[]) {
  return [...rows].sort((a, b) => {
    const ra = URGENCY_RANK[a.urgency] ?? 9;
    const rb = URGENCY_RANK[b.urgency] ?? 9;
    if (ra !== rb) return ra - rb;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

function listTicketIds(dataDir: string) {
  ensureDirs(dataDir);
  return fs
    .readdirSync(ticketsDir(dataDir))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

function readTicketFile(dataDir: string, id: string): SupportTicket | null {
  const fp = ticketPath(dataDir, id);
  if (!fs.existsSync(fp)) return null;
  try {
    return normalizeTicket(JSON.parse(fs.readFileSync(fp, 'utf8')) as SupportTicket);
  } catch {
    return null;
  }
}

export async function readTicket(dataDir: string, id: string): Promise<SupportTicket | null> {
  if (pgEnabled()) return pgReadTicket(dataDir, id);
  return readTicketFile(dataDir, id);
}

function writeTicket(dataDir: string, ticket: SupportTicket) {
  ensureDirs(dataDir);
  ticket.updatedAt = new Date().toISOString();
  fs.writeFileSync(ticketPath(dataDir, ticket.id), JSON.stringify(ticket, null, 2), 'utf8');
  return ticket;
}

function saveAttachments(dataDir: string, ticketId: string, screenshots: SupportScreenshotInput[]) {
  const saved: SupportTicket['attachments'] = [];
  const list = Array.isArray(screenshots) ? screenshots.slice(0, 5) : [];
  const ticketAttDir = path.join(attachmentsRoot(dataDir), ticketId);
  fs.mkdirSync(ticketAttDir, { recursive: true });

  for (let i = 0; i < list.length; i++) {
    const item = list[i] || {};
    const mime = normStr(item.mimeType || 'image/png', 64).toLowerCase();
    if (!/^image\/(png|jpeg|jpg|webp|gif)$/i.test(mime)) continue;
    const raw = String(item.dataBase64 || '').replace(/^data:[^;]+;base64,/, '');
    if (!raw) continue;
    let buf: Buffer;
    try {
      buf = Buffer.from(raw, 'base64');
    } catch {
      continue;
    }
    if (!buf.length || buf.length > 1_500_000) continue;

    const ext = mime.includes('jpeg') || mime.includes('jpg')
      ? 'jpg'
      : mime.includes('webp')
        ? 'webp'
        : mime.includes('gif')
          ? 'gif'
          : 'png';
    const attId = `${i + 1}-${crypto.randomBytes(4).toString('hex')}`;
    const filename = normStr(item.filename || `screenshot-${attId}.${ext}`, 120).replace(
      /[^a-zA-Z0-9._-]/g,
      '_',
    );
    const relPath = path.join('attachments', ticketId, filename);
    const absPath = path.join(ticketsDir(dataDir), relPath);
    fs.writeFileSync(absPath, buf);
    saved.push({ id: attId, filename, mimeType: mime, size: buf.length, path: relPath });
  }
  return saved;
}

function findRecentDuplicates(dataDir: string, userId: string | null, subject: string, hours = 24) {
  if (!userId) return [] as string[];
  const cutoff = Date.now() - hours * 3600 * 1000;
  const subj = normStr(subject, 200).toLowerCase();
  return listTicketIds(dataDir)
    .map((id) => readTicketFile(dataDir, id))
    .filter(Boolean)
    .filter((t) => {
      if (t!.userId !== userId) return false;
      const created = new Date(t!.createdAt).getTime();
      if (!Number.isFinite(created) || created < cutoff) return false;
      const other = normStr(t!.subject, 200).toLowerCase();
      return other === subj || other.includes(subj) || subj.includes(other);
    })
    .map((t) => t!.id);
}

export async function listTickets(dataDir: string) {
  if (pgEnabled()) {
    const { pgListTickets } = await import('@/lib/dp-support-store');
    return pgListTickets(dataDir);
  }
  return sortTickets(
    listTicketIds(dataDir)
      .map((id) => readTicketFile(dataDir, id))
      .filter(Boolean) as SupportTicket[],
  );
}

export function publicTicketSummary(ticket: SupportTicket) {
  return {
    id: ticket.id,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    status: ticket.status,
    subject: ticket.subject,
    urgency: ticket.urgency,
    category: ticket.category,
    pageUrl: ticket.pageUrl,
    hasScreenshots: ticket.hasScreenshots,
  };
}

export interface CreateTicketInput {
  ticketId?: string;
  subject?: string;
  body?: string;
  urgency?: string;
  category?: string;
  screenshotAcknowledged?: boolean;
  userId?: string;
  email?: string;
  handle?: string;
  screenshots?: SupportScreenshotInput[];
  pageUrl?: string;
  browser?: string;
  os?: string;
  canopiMode?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  triedAlready?: string;
  diagnosticBundle?: Record<string, unknown> | null;
}

export async function createTicket(dataDir: string, input: CreateTicketInput) {
  const urgency = normStr(input.urgency, 32).toLowerCase() as SupportUrgency;
  const category = normStr(input.category, 64).toLowerCase() as SupportCategory;
  if (!VALID_URGENCY.has(urgency)) return { ok: false as const, error: 'invalid_urgency' };
  if (!VALID_CATEGORY.has(category)) return { ok: false as const, error: 'invalid_category' };

  const subject = normStr(input.subject, 200);
  const body = normStr(input.body, 8000);
  if (!subject) return { ok: false as const, error: 'subject_required' };
  if (!body) return { ok: false as const, error: 'body_required' };

  const id = crypto.randomUUID();
  const attachments = saveAttachments(dataDir, id, input.screenshots || []);
  const hasScreenshots = attachments.length > 0;
  if (
    category === 'technical_support' &&
    !input.screenshotAcknowledged &&
    !hasScreenshots
  ) {
    return { ok: false as const, error: 'screenshot_ack_required' };
  }

  if (pgEnabled()) {
    return pgCreateTicket(dataDir, { ...input, ticketId: id }, attachments, hasScreenshots);
  }

  const now = new Date().toISOString();
  const userId = normStr(input.userId, 128) || null;
  const duplicates = findRecentDuplicates(dataDir, userId, subject);

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

  writeTicket(dataDir, ticket);
  return { ok: true as const, ticket };
}

export async function searchTickets(
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
  if (pgEnabled()) return pgSearchTickets(dataDir, filters);

  const q = normStr(filters.q, 200).toLowerCase();
  const urgency = normStr(filters.urgency, 32).toLowerCase() as SupportUrgency;
  const category = normStr(filters.category, 64).toLowerCase() as SupportCategory;
  const status = normStr(filters.status, 32).toLowerCase() as SupportStatus;
  const userId = normStr(filters.userId, 128);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 50));
  const offset = Math.max(0, Number(filters.offset) || 0);

  let rows = await listTickets(dataDir);
  if (urgency && VALID_URGENCY.has(urgency)) rows = rows.filter((t) => t.urgency === urgency);
  if (category && VALID_CATEGORY.has(category)) rows = rows.filter((t) => t.category === category);
  if (status && VALID_STATUS.has(status)) rows = rows.filter((t) => t.status === status);
  if (userId) rows = rows.filter((t) => t.userId === userId);
  if (q) {
    rows = rows.filter((t) => {
      const hay = [
        t.id,
        t.subject,
        t.body,
        t.email,
        t.handle,
        t.userId,
        t.category,
        t.urgency,
        t.pageUrl,
      ]
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

export function supportDataDir() {
  return path.join(process.cwd(), 'data');
}

export async function attachmentAbsPath(dataDir: string, ticketId: string, filename: string) {
  const safe = path.basename(String(filename || ''));
  if (!safe || safe !== filename) return null;
  const ticket = await readTicket(dataDir, ticketId);
  if (!ticket) return null;
  const att = ticket.attachments.find((a) => a.filename === safe);
  if (!att) return null;
  return path.join(ticketsDir(dataDir), att.path);
}

export function dpPublicBase() {
  return String(process.env.DP_PUBLIC_BASE || 'https://desirableproperties.org').replace(/\/$/, '');
}

export function attachmentUrls(ticket: SupportTicket) {
  const base = dpPublicBase();
  if (!ticket.attachments.length) return [];
  return ticket.attachments.map((a) => ({
    filename: a.filename,
    mimeType: a.mimeType,
    size: a.size,
    url: `${base}/api/support/hermes/tickets/${encodeURIComponent(ticket.id)}/attachments/${encodeURIComponent(a.filename)}`,
  }));
}

export function publicTicketSummaryExtended(ticket: SupportTicket, opts: { includeBody?: boolean } = {}) {
  const summary = {
    ...publicTicketSummary(ticket),
    email: ticket.email,
    handle: ticket.handle,
    userId: ticket.userId,
    escalatedToHuman: ticket.escalatedToHuman,
    bodyPreview: String(ticket.body || '').slice(0, 280),
  } as Record<string, unknown>;
  if (opts.includeBody) {
    summary.body = ticket.body;
    summary.stepsToReproduce = ticket.stepsToReproduce;
    summary.expectedBehavior = ticket.expectedBehavior;
    summary.actualBehavior = ticket.actualBehavior;
    summary.triedAlready = ticket.triedAlready;
    summary.agentNotes = ticket.agentNotes;
    summary.draftReply = ticket.draftReply;
    summary.proposedResolution = ticket.proposedResolution;
    summary.resolution = ticket.resolution;
    summary.diagnosticBundle = ticket.diagnosticBundle;
    summary.browser = ticket.browser;
    summary.os = ticket.os;
    summary.attachments = ticket.attachments;
    summary.blueberryAward = ticket.blueberryAward || null;
  }
  summary.attachmentUrls = attachmentUrls(ticket);
  return summary;
}

export function ticketForHermes(ticket: SupportTicket) {
  return publicTicketSummaryExtended(ticket, { includeBody: true });
}

export async function patchTicket(
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
  if (pgEnabled()) return pgPatchTicket(dataDir, id, patch);

  const ticket = readTicketFile(dataDir, id);
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

  return { ok: true as const, ticket: writeTicket(dataDir, ticket) };
}

export async function markDraftReplySent(dataDir: string, id: string, sentBy: string) {
  if (pgEnabled()) return pgMarkDraftReplySent(dataDir, id, sentBy);

  const ticket = readTicketFile(dataDir, id);
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
  return { ok: true as const, ticket: writeTicket(dataDir, ticket) };
}
