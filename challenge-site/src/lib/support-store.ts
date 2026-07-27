import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

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
}

const VALID_URGENCY = new Set<SupportUrgency>(['critical', 'blocking', 'non_blocking']);
const VALID_CATEGORY = new Set<SupportCategory>(SUPPORT_CATEGORIES);
const VALID_STATUS = new Set<SupportStatus>(['open', 'triaged', 'closed']);
const URGENCY_RANK: Record<SupportUrgency, number> = {
  critical: 0,
  blocking: 1,
  non_blocking: 2,
};

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

function readTicket(dataDir: string, id: string): SupportTicket | null {
  const fp = ticketPath(dataDir, id);
  if (!fs.existsSync(fp)) return null;
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8')) as SupportTicket;
  } catch {
    return null;
  }
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
  return listTickets(dataDir)
    .filter((t) => {
      if (t.userId !== userId) return false;
      const created = new Date(t.createdAt).getTime();
      if (!Number.isFinite(created) || created < cutoff) return false;
      const other = normStr(t.subject, 200).toLowerCase();
      return other === subj || other.includes(subj) || subj.includes(other);
    })
    .map((t) => t.id);
}

export function listTickets(dataDir: string) {
  return sortTickets(
    listTicketIds(dataDir)
      .map((id) => readTicket(dataDir, id))
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

export function createTicket(dataDir: string, input: CreateTicketInput) {
  const urgency = normStr(input.urgency, 32).toLowerCase() as SupportUrgency;
  const category = normStr(input.category, 64).toLowerCase() as SupportCategory;
  if (!VALID_URGENCY.has(urgency)) return { ok: false as const, error: 'invalid_urgency' };
  if (!VALID_CATEGORY.has(category)) return { ok: false as const, error: 'invalid_category' };

  const subject = normStr(input.subject, 200);
  const body = normStr(input.body, 8000);
  if (!subject) return { ok: false as const, error: 'subject_required' };
  if (!body) return { ok: false as const, error: 'body_required' };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const attachments = saveAttachments(dataDir, id, input.screenshots || []);
  const hasScreenshots = attachments.length > 0;
  if (
    category === 'technical_support' &&
    !input.screenshotAcknowledged &&
    !hasScreenshots
  ) {
    return { ok: false as const, error: 'screenshot_ack_required' };
  }

  const userId = normStr(input.userId, 128) || null;
  const duplicates = findRecentDuplicates(dataDir, userId, subject);

  const ticket: SupportTicket = {
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
  };

  if (urgency === 'critical') {
    ticket.status = 'open';
  }

  writeTicket(dataDir, ticket);
  return { ok: true as const, ticket };
}

export function searchTickets(
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

  let rows = listTickets(dataDir);
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

export function attachmentAbsPath(dataDir: string, ticketId: string, filename: string) {
  const safe = path.basename(String(filename || ''));
  if (!safe || safe !== filename) return null;
  const ticket = readTicket(dataDir, ticketId);
  if (!ticket) return null;
  const att = ticket.attachments.find((a) => a.filename === safe);
  if (!att) return null;
  return path.join(ticketsDir(dataDir), att.path);
}
