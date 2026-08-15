import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';
import { enrichBroadcastAudienceEmails } from '@/lib/dp-broadcast-email';
import { fetchGovHubPatchStatus } from '@/lib/dp-govhub-patch-status';
import {
  sanitizeBroadcastHtml,
  stripHtml,
  wrapBroadcastBodyHtml,
} from '@/lib/dp-broadcast-send';
import {
  ensureUnsubscribeToken,
  indexUnsubscribeToken,
  isUserOptedOut,
} from '@/lib/dp-broadcast-preferences-store';
import { resolveBroadcastRecipientRow } from '@/lib/dp-broadcast-cohort-recipients';
import type { BroadcastRecipientResult } from '@/lib/dp-broadcast-result';
import { isCanopiUserId, fetchCanopiUserHandles } from '@/lib/dp-canopi-user';
import {
  fetchWorkgroupSignups,
  type WorkgroupSignupGroup,
  type WorkgroupSignupPerson,
} from '@/lib/workgroup-signups';
import { govhubUrl } from '@/lib/govhub';

export type BroadcastWorkgroupRef = {
  id: string;
  name: string;
  slug: string;
};

export type BroadcastAudienceRow = {
  key: string;
  userId: string | null;
  userName: string | null;
  email: string | null;
  canopiHandle?: string | null;
  workgroups: string[];
  workgroupIds: string[];
  workgroupDetails: BroadcastWorkgroupRef[];
  joinedAt: string | null;
  hasSubmittedPatch?: boolean;
  patchCount?: number;
  patchDpIds?: string[];
};

export type BroadcastWorkgroupMember = {
  key: string;
  userName: string | null;
};

export type BroadcastWorkgroupRow = {
  id: string;
  name: string;
  slug: string;
  acronym: string;
  memberCount: number;
  memberKeys: string[];
  members: BroadcastWorkgroupMember[];
};

export type BroadcastLogEntry = {
  id: string;
  subject: string;
  html: string;
  textBody: string;
  sentAt: string;
  sentBy: string | null;
  audienceFilter: Record<string, unknown> | null;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  testMode: boolean;
  fontId: string;
  availableInArchive: boolean;
  recipients: Array<Record<string, unknown>>;
};

export type BroadcastArchiveEntry = {
  id: string;
  subject: string;
  sentAt: string;
};

function normStr(s: unknown, max = 8000) {
  return String(s ?? '').trim().slice(0, max);
}

function personKey(person: WorkgroupSignupPerson) {
  return person.user_id || person.user_name || crypto.randomUUID();
}

function rowToLog(row: Record<string, unknown>): BroadcastLogEntry {
  return {
    id: String(row.id),
    subject: String(row.subject || ''),
    html: String(row.html || ''),
    textBody: String(row.text_body || ''),
    sentAt: new Date(String(row.sent_at)).toISOString(),
    sentBy: row.sent_by ? String(row.sent_by) : null,
    audienceFilter:
      row.audience_filter && typeof row.audience_filter === 'object'
        ? (row.audience_filter as Record<string, unknown>)
        : null,
    recipientCount: Number(row.recipient_count) || 0,
    successCount: Number(row.success_count) || 0,
    failureCount: Number(row.failure_count) || 0,
    testMode: Boolean(row.test_mode),
    fontId: String(row.font_id || 'default'),
    availableInArchive: Boolean(row.available_in_archive),
    recipients: Array.isArray(row.recipients) ? (row.recipients as Array<Record<string, unknown>>) : [],
  };
}

function mapPersonToRow(person: WorkgroupSignupPerson): BroadcastAudienceRow {
  return {
    key: personKey(person),
    userId: person.user_id,
    userName: person.user_name,
    email: null,
    workgroups: person.workgroups.map((wg) => wg.name),
    workgroupIds: person.workgroups.map((wg) => wg.id),
    workgroupDetails: person.workgroups.map((wg) => ({
      id: wg.id,
      name: wg.name,
      slug: wg.slug,
    })),
    joinedAt: person.workgroups[0]?.joined_at ?? null,
  };
}

export async function buildBroadcastWorkgroups(): Promise<BroadcastWorkgroupRow[]> {
  const payload = await fetchWorkgroupSignups();
  if (!payload) return [];

  return payload.workgroups.map((wg: WorkgroupSignupGroup) => {
    const memberKeys = wg.members.map((member) => member.user_id || member.user_name || member.id);
    return {
      id: wg.id,
      name: wg.name,
      slug: wg.slug,
      acronym: wg.acronym,
      memberCount: wg.member_count,
      memberKeys: [...new Set(memberKeys.filter(Boolean))],
      members: wg.members.map((member) => ({
        key: member.user_id || member.user_name || member.id,
        userName: member.user_name,
      })),
    };
  });
}

export async function buildBroadcastAudience(opts: {
  q?: string;
  workgroup?: string;
} = {}): Promise<BroadcastAudienceRow[]> {
  const payload = await fetchWorkgroupSignups();
  if (!payload) return [];

  const q = normStr(opts.q, 200).toLowerCase();
  const workgroupFilter = normStr(opts.workgroup, 120).toLowerCase();

  const rows: BroadcastAudienceRow[] = payload.people.map(mapPersonToRow);

  const filtered = rows.filter((row) => {
    if (workgroupFilter) {
      const match = row.workgroups.some((wg) => wg.toLowerCase().includes(workgroupFilter));
      if (!match) return false;
    }
    if (!q) return true;
    const hay = [row.userName, row.userId, ...row.workgroups].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });

  const patchStatusByUser = await fetchGovHubPatchStatus();
  const withPatchStatus = filtered.map((row) => {
    const userId = String(row.userId || '').trim();
    const patch = userId ? patchStatusByUser.get(userId) : null;
    const patchCount = patch?.patchCount || 0;
    const patchDpIds = patch?.patchDpIds || [];
    return {
      ...row,
      hasSubmittedPatch: patchCount > 0,
      patchCount,
      patchDpIds,
    };
  });

  const { rows: enriched } = await enrichBroadcastAudienceEmails(withPatchStatus);
  return enriched;
}

export async function isWorkgroupParticipant(userId: string | null | undefined) {
  const id = String(userId || '').trim();
  if (!id) return false;
  const payload = await fetchWorkgroupSignups();
  if (!payload) return false;
  return payload.people.some((person) => person.user_id === id);
}

function formatWorkgroupsPlain(details: BroadcastWorkgroupRef[]) {
  const names = details.map((wg) => wg.name).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function formatWorkgroupsHtml(details: BroadcastWorkgroupRef[]) {
  const items = details.filter((wg) => wg.name);
  if (items.length === 0) return '';

  const linkFor = (wg: BroadcastWorkgroupRef) => {
    const href = wg.slug ? govhubUrl(`/workgroups/${wg.slug}/`) : '';
    const label = escapeHtml(wg.name);
    if (!href) return label;
    return `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${label}</a>`;
  };

  if (items.length === 1) return linkFor(items[0]);
  if (items.length === 2) return `${linkFor(items[0])} and ${linkFor(items[1])}`;
  const head = items.slice(0, -1).map(linkFor).join(', ');
  return `${head}, and ${linkFor(items[items.length - 1])}`;
}

function canopiAppBase() {
  return (process.env.CANOPI_APP_BASE?.trim() || 'https://app.canopi.live').replace(/\/$/, '');
}

function handleFromUserName(userName: string | null | undefined) {
  const raw = String(userName || '').trim();
  if (raw.startsWith('@')) return raw.replace(/^@+/, '');
  return null;
}

function canopiProfileLinkForRow(row: BroadcastAudienceRow) {
  const handle = String(row.canopiHandle || handleFromUserName(row.userName) || '')
    .trim()
    .replace(/^@+/, '');
  if (!handle) return '';
  return `${canopiAppBase()}/p/${encodeURIComponent(handle)}`;
}

function applyMergeTags(template: string, row: BroadcastAudienceRow, format: 'html' | 'plain' = 'html') {
  const name = row.userName?.split(/\s+/)[0] || 'there';
  const profileLink = canopiProfileLinkForRow(row);
  const workgroupsValue =
    format === 'plain'
      ? formatWorkgroupsPlain(row.workgroupDetails)
      : formatWorkgroupsHtml(row.workgroupDetails);
  return template
    .replace(/\{name\}/gi, name)
    .replace(/\{userName\}/gi, row.userName || '')
    .replace(/\{profileLink\}/gi, profileLink)
    .replace(/\{profile link\}/gi, profileLink)
    .replace(/\{workgroups?\}/gi, workgroupsValue);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function publicBase() {
  return (
    process.env.DP_PUBLIC_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    'https://desirableproperties.org'
  ).replace(/\/$/, '');
}

function appendUnsubscribeFooter(html: string, text: string | undefined, unsubscribeUrl: string) {
  const footerHtml = `<p style="font-size:12px;color:#666;margin-top:2em;">You received this because you joined a Desirable Properties workgroup. <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe from challenge updates</a>.</p>`;
  const footerText = `\n\nYou received this because you joined a Desirable Properties workgroup. Unsubscribe: ${unsubscribeUrl}`;
  return {
    html: html.includes('</body>')
      ? html.replace('</body>', `${footerHtml}</body>`)
      : `${html}${footerHtml}`,
    text: text ? `${text}${footerText}` : footerText.trim(),
  };
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  unsubscribeUrl?: string;
  tags?: Array<{ name: string; value: string }>;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false as const, error: 'resend_not_configured' };

  const from =
    process.env.DP_BROADCAST_FROM?.trim() ||
    process.env.DP_SUPPORT_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Desirable Properties <noreply@desirableproperties.org>';

  const headers: Record<string, string> = {};
  if (payload.unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${payload.unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      headers: Object.keys(headers).length ? headers : undefined,
      tags: payload.tags,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false as const, error: 'send_failed', detail: data };
  return { ok: true as const, id: data.id as string | undefined };
}

export async function sendBroadcast(input: {
  subject: string;
  html: string;
  textBody?: string;
  sentBy: string;
  testMode?: boolean;
  testEmail?: string;
  recipientKeys?: string[];
  audienceFilter?: Record<string, unknown>;
  fontId?: string;
  availableInArchive?: boolean;
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const subject = normStr(input.subject, 200);
  const htmlRaw = sanitizeBroadcastHtml(normStr(input.html, 50000));
  const fontId = normStr(input.fontId || 'default', 40).toLowerCase() || 'default';
  if (!subject) return { ok: false as const, error: 'subject_required' };
  if (!htmlRaw) return { ok: false as const, error: 'html_required' };

  const audience = await buildBroadcastAudience();
  const keySet =
    input.recipientKeys && input.recipientKeys.length
      ? new Set(input.recipientKeys.map((k) => String(k)))
      : null;

  let targets = audience.filter((row) => !keySet || keySet.has(row.key));

  if (keySet) {
    const resolved: BroadcastAudienceRow[] = [];
    const seen = new Set<string>();
    for (const key of keySet) {
      if (seen.has(key)) continue;
      const row = resolveBroadcastRecipientRow(key, audience);
      if (row) {
        const full: BroadcastAudienceRow =
          'workgroupIds' in row
            ? (row as BroadcastAudienceRow)
            : {
                ...row,
                workgroupIds: [],
                workgroupDetails: [],
                joinedAt: null,
              };
        resolved.push(full);
        seen.add(key);
      }
    }
    targets = resolved;
  }
  const testMode = Boolean(input.testMode);
  const testEmail = normStr(input.testEmail, 200).toLowerCase();

  if (!testMode) {
    const filtered: BroadcastAudienceRow[] = [];
    for (const row of targets) {
      if (row.userId && isCanopiUserId(row.userId) && (await isUserOptedOut(row.userId))) {
        continue;
      }
      filtered.push(row);
    }
    targets = filtered;
  }

  if (testMode) {
    if (!testEmail) return { ok: false as const, error: 'test_email_required' };
    targets = [
      {
        key: 'test',
        userId: null,
        userName: 'Test recipient',
        email: testEmail,
        workgroups: [],
        workgroupIds: [],
        workgroupDetails: [],
        joinedAt: null,
      },
    ];
  }

  const recipientResults: BroadcastRecipientResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  const broadcastId = crypto.randomUUID();
  const base = publicBase();
  const wrappedTemplate = wrapBroadcastBodyHtml(htmlRaw, fontId);

  const canopiIds = targets.map((row) => row.userId).filter((id): id is string => Boolean(id && isCanopiUserId(id)));
  const handleMap = testMode ? new Map<string, string>() : await fetchCanopiUserHandles(canopiIds);
  const targetsWithHandles = targets.map((row) => {
    const fromApi = row.userId ? handleMap.get(row.userId) : null;
    const fromName = handleFromUserName(row.userName);
    const canopiHandle = fromApi || fromName || row.canopiHandle || null;
    return canopiHandle && canopiHandle !== row.canopiHandle ? { ...row, canopiHandle } : row;
  });

  for (const row of targetsWithHandles) {
    const to = row.email;
    if (!to) {
      failureCount += 1;
      recipientResults.push({
        key: row.key,
        userName: row.userName,
        ok: false,
        error: 'missing_email',
      });
      continue;
    }

    let unsubscribeUrl = `${base}/api/broadcast/unsubscribe`;
    if (row.userId && isCanopiUserId(row.userId)) {
      const tokenResult = await ensureUnsubscribeToken(row.userId, to);
      if (tokenResult.ok && tokenResult.token) {
        await indexUnsubscribeToken({ token: tokenResult.token, userId: row.userId, email: to });
        unsubscribeUrl = `${base}/api/broadcast/unsubscribe?token=${encodeURIComponent(tokenResult.token)}`;
      }
    }

    const personalizedHtml = applyMergeTags(wrappedTemplate, row, 'html');
    const personalizedSubject = applyMergeTags(subject, row, 'plain');
    const textBody = input.textBody
      ? applyMergeTags(input.textBody, row, 'plain')
      : stripHtml(personalizedHtml);
    const withFooter = appendUnsubscribeFooter(personalizedHtml, textBody, unsubscribeUrl);
    const result = await sendViaResend({
      to,
      subject: personalizedSubject,
      html: withFooter.html,
      text: withFooter.text,
      unsubscribeUrl,
      tags: [
        { name: 'broadcast_id', value: broadcastId },
        ...(row.userId ? [{ name: 'canopi_user_id', value: row.userId }] : []),
      ],
    });

    if (result.ok) {
      successCount += 1;
      recipientResults.push({ key: row.key, userName: row.userName, email: to, ok: true, resendId: result.id });
    } else {
      failureCount += 1;
      recipientResults.push({
        key: row.key,
        userName: row.userName,
        email: to,
        ok: false,
        error: result.error,
      });
    }
  }

  const availableInArchive = Boolean(input.availableInArchive) && successCount > 0 && !testMode;

  await pool.query(
    `INSERT INTO dp_broadcast_log (
       id, subject, html, text_body, sent_at, sent_by, audience_filter,
       recipient_count, success_count, failure_count, test_mode, recipients,
       font_id, available_in_archive
     ) VALUES ($1,$2,$3,$4,now(),$5,$6::jsonb,$7,$8,$9,$10,$11::jsonb,$12,$13)`,
    [
      broadcastId,
      subject,
      htmlRaw,
      normStr(input.textBody || stripHtml(htmlRaw), 50000),
      normStr(input.sentBy, 120),
      JSON.stringify(input.audienceFilter || {}),
      targets.length,
      successCount,
      failureCount,
      testMode,
      JSON.stringify(recipientResults),
      fontId,
      availableInArchive,
    ],
  );

  return {
    ok: true as const,
    id: broadcastId,
    recipientCount: targets.length,
    successCount,
    failureCount,
    failures: recipientResults.filter((r) => !r.ok),
    testMode,
    availableInArchive,
    emailEnrichment: testMode
      ? undefined
      : {
          attempted: audience.length,
          withEmail: audience.filter((r) => r.email).length,
          missingEmail: audience.filter((r) => !r.email).length,
        },
  };
}

export async function listBroadcastLog(limit = 50, offset = 0) {
  const pool = await ensureDpSchema();
  if (!pool) return { total: 0, entries: [] as BroadcastLogEntry[] };

  const countRes = await pool.query('SELECT COUNT(*)::int AS n FROM dp_broadcast_log');
  const total = countRes.rows[0]?.n || 0;
  const res = await pool.query(
    'SELECT * FROM dp_broadcast_log ORDER BY sent_at DESC LIMIT $1 OFFSET $2',
    [Math.min(100, Math.max(1, limit)), Math.max(0, offset)],
  );

  return {
    total,
    entries: res.rows.map((row) => {
      const entry = rowToLog(row);
      return {
        ...entry,
        html: '',
        recipients: entry.recipients.slice(0, 0),
      };
    }),
  };
}

export async function getBroadcastLogEntry(id: string) {
  const pool = await ensureDpSchema();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM dp_broadcast_log WHERE id = $1', [id]);
  return res.rows[0] ? rowToLog(res.rows[0]) : null;
}

export async function listBroadcastArchiveEntries() {
  const pool = await ensureDpSchema();
  if (!pool) return [] as BroadcastArchiveEntry[];

  const res = await pool.query(
    `SELECT id, subject, sent_at
     FROM dp_broadcast_log
     WHERE available_in_archive = true AND test_mode = false AND success_count > 0
     ORDER BY sent_at DESC
     LIMIT 100`,
  );

  return res.rows.map((row) => ({
    id: String(row.id),
    subject: String(row.subject || ''),
    sentAt: new Date(String(row.sent_at)).toISOString(),
  }));
}

export async function getBroadcastArchiveEntry(id: string) {
  const pool = await ensureDpSchema();
  if (!pool) return null;

  const res = await pool.query(
    `SELECT id, subject, html, font_id, sent_at
     FROM dp_broadcast_log
     WHERE id = $1 AND available_in_archive = true AND test_mode = false AND success_count > 0`,
    [id],
  );
  if (!res.rows[0]) return null;

  const row = res.rows[0];
  return {
    id: String(row.id),
    subject: String(row.subject || ''),
    html: String(row.html || ''),
    fontId: String(row.font_id || 'default'),
    sentAt: new Date(String(row.sent_at)).toISOString(),
  };
}

export type RecipientBroadcastHistoryItem = {
  id: string;
  subject: string;
  sentAt: string;
  testMode: boolean;
  ok: boolean;
};

export async function getRecipientBroadcastHistory(email: string, limit = 30) {
  const pool = await ensureDpSchema();
  if (!pool) return [] as RecipientBroadcastHistoryItem[];

  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized.includes('@')) return [];

  const res = await pool.query(
    `SELECT id, subject, sent_at, test_mode, recipients
     FROM dp_broadcast_log
     WHERE EXISTS (
       SELECT 1 FROM jsonb_array_elements(recipients) AS r
       WHERE lower(trim(r->>'email')) = $1
     )
     ORDER BY sent_at DESC
     LIMIT $2`,
    [normalized, Math.min(50, Math.max(1, limit))],
  );

  return res.rows.map((row) => {
    const recipients = Array.isArray(row.recipients)
      ? (row.recipients as Array<Record<string, unknown>>)
      : [];
    const match = recipients.find(
      (r) => String(r.email || '').trim().toLowerCase() === normalized,
    );
    return {
      id: String(row.id),
      subject: String(row.subject || ''),
      sentAt: new Date(String(row.sent_at)).toISOString(),
      testMode: Boolean(row.test_mode),
      ok: match ? Boolean(match.ok) : true,
    };
  });
}

export function previewBroadcastHtml(
  html: string,
  row?: BroadcastAudienceRow,
  fontId?: string | null,
) {
  const sample =
    row ||
    ({
      key: 'sample',
      userId: null,
      userName: 'Alex Example',
      email: 'alex@example.com',
      canopiHandle: 'alex',
      workgroups: ['DP1 Federated Auth', 'DP2 Discovery'],
      workgroupIds: [],
      workgroupDetails: [
        { id: 'wg1', name: 'DP1 Federated Auth', slug: 'dp1-federated-auth' },
        { id: 'wg2', name: 'DP2 Discovery', slug: 'dp2-discovery' },
      ],
      joinedAt: new Date().toISOString(),
    } satisfies BroadcastAudienceRow);

  const sanitized = sanitizeBroadcastHtml(html);
  const wrapped = wrapBroadcastBodyHtml(applyMergeTags(sanitized, sample, 'html'), fontId);
  const base = publicBase();
  const footer = `<p style="font-size:12px;color:#666;margin-top:2em;">You received this because you joined a Desirable Properties workgroup. <a href="${base}/api/broadcast/unsubscribe">Unsubscribe from challenge updates</a>.</p>`;
  return wrapped.includes('</body>') ? wrapped.replace('</body>', `${footer}</body>`) : `${wrapped}${footer}`;
}

export function renderArchiveForViewer(
  entry: { subject: string; html: string; fontId?: string | null },
  viewer: BroadcastAudienceRow,
) {
  const subject = applyMergeTags(entry.subject, viewer, 'plain');
  const html = previewBroadcastHtml(entry.html, viewer, entry.fontId);
  return { subject, html };
}
