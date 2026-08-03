import crypto from 'crypto';
import { ensureDpSchema } from '@/lib/dp-db';
import { enrichBroadcastAudienceEmails } from '@/lib/dp-broadcast-email';
import { fetchWorkgroupSignups, type WorkgroupSignupPerson } from '@/lib/workgroup-signups';

export type BroadcastAudienceRow = {
  key: string;
  userId: string | null;
  userName: string | null;
  email: string | null;
  workgroups: string[];
  joinedAt: string | null;
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
  recipients: Array<Record<string, unknown>>;
};

function normStr(s: unknown, max = 8000) {
  return String(s ?? '').trim().slice(0, max);
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
    recipients: Array.isArray(row.recipients) ? (row.recipients as Array<Record<string, unknown>>) : [],
  };
}

export async function buildBroadcastAudience(opts: {
  q?: string;
  workgroup?: string;
} = {}): Promise<BroadcastAudienceRow[]> {
  const payload = await fetchWorkgroupSignups();
  if (!payload) return [];

  const q = normStr(opts.q, 200).toLowerCase();
  const workgroupFilter = normStr(opts.workgroup, 120).toLowerCase();

  const rows: BroadcastAudienceRow[] = payload.people.map((person: WorkgroupSignupPerson) => ({
    key: person.user_id || person.user_name || crypto.randomUUID(),
    userId: person.user_id,
    userName: person.user_name,
    email: null,
    workgroups: person.workgroups.map((wg) => wg.name),
    joinedAt: person.workgroups[0]?.joined_at ?? null,
  }));

  const filtered = rows.filter((row) => {
    if (workgroupFilter) {
      const match = row.workgroups.some((wg) => wg.toLowerCase().includes(workgroupFilter));
      if (!match) return false;
    }
    if (!q) return true;
    const hay = [row.userName, row.userId, ...row.workgroups].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });

  const { rows: enriched } = await enrichBroadcastAudienceEmails(filtered);
  return enriched;
}

function applyMergeTags(template: string, row: BroadcastAudienceRow) {
  const name = row.userName?.split(/\s+/)[0] || 'there';
  return template
    .replace(/\{name\}/gi, name)
    .replace(/\{userName\}/gi, row.userName || '')
    .replace(/\{workgroups\}/gi, row.workgroups.join(', '));
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false as const, error: 'resend_not_configured' };

  const from =
    process.env.DP_BROADCAST_FROM?.trim() ||
    process.env.DP_SUPPORT_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Desirable Properties <noreply@desirableproperties.org>';

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
}) {
  const pool = await ensureDpSchema();
  if (!pool) return { ok: false as const, error: 'database_unavailable' };

  const subject = normStr(input.subject, 200);
  const html = normStr(input.html, 50000);
  if (!subject) return { ok: false as const, error: 'subject_required' };
  if (!html) return { ok: false as const, error: 'html_required' };

  const audience = await buildBroadcastAudience();
  const keySet =
    input.recipientKeys && input.recipientKeys.length
      ? new Set(input.recipientKeys.map((k) => String(k)))
      : null;

  let targets = audience.filter((row) => !keySet || keySet.has(row.key));
  const testMode = Boolean(input.testMode);
  const testEmail = normStr(input.testEmail, 200).toLowerCase();

  if (testMode) {
    if (!testEmail) return { ok: false as const, error: 'test_email_required' };
    targets = [
      {
        key: 'test',
        userId: null,
        userName: 'Test recipient',
        email: testEmail,
        workgroups: [],
        joinedAt: null,
      },
    ];
  }

  const recipientResults: Array<Record<string, unknown>> = [];
  let successCount = 0;
  let failureCount = 0;

  for (const row of targets) {
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

    const personalizedHtml = applyMergeTags(html, row);
    const personalizedSubject = applyMergeTags(subject, row);
    const textBody = input.textBody ? applyMergeTags(input.textBody, row) : undefined;
    const result = await sendViaResend({
      to,
      subject: personalizedSubject,
      html: personalizedHtml,
      text: textBody,
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

  const id = crypto.randomUUID();
  await pool.query(
    `INSERT INTO dp_broadcast_log (
       id, subject, html, text_body, sent_at, sent_by, audience_filter,
       recipient_count, success_count, failure_count, test_mode, recipients
     ) VALUES ($1,$2,$3,$4,now(),$5,$6::jsonb,$7,$8,$9,$10,$11::jsonb)`,
    [
      id,
      subject,
      html,
      normStr(input.textBody, 50000),
      normStr(input.sentBy, 120),
      JSON.stringify(input.audienceFilter || {}),
      targets.length,
      successCount,
      failureCount,
      testMode,
      JSON.stringify(recipientResults),
    ],
  );

  return {
    ok: true as const,
    id,
    recipientCount: targets.length,
    successCount,
    failureCount,
    testMode,
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

export function previewBroadcastHtml(html: string, row?: BroadcastAudienceRow) {
  const sample =
    row ||
    ({
      key: 'sample',
      userId: null,
      userName: 'Alex Example',
      email: 'alex@example.com',
      workgroups: ['DP1 Workgroup'],
      joinedAt: new Date().toISOString(),
    } satisfies BroadcastAudienceRow);
  return applyMergeTags(html, sample);
}
