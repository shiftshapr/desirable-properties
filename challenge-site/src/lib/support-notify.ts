import fs from 'fs';
import type { SupportTicket } from '@/lib/support-store';
import { attachmentAbsPath } from '@/lib/support-store';

function defaultOpsEmail() {
  return (
    process.env.DP_SUPPORT_EMAIL?.trim().toLowerCase() ||
    process.env.SUPPORT_EMAIL?.trim().toLowerCase() ||
    'support@themetalayer.org'
  );
}

function alertEmailForTicket(ticket: SupportTicket) {
  const urgency = String(ticket.urgency || '').toLowerCase();
  if (urgency === 'critical') {
    return process.env.DP_SUPPORT_CRITICAL_EMAIL?.trim().toLowerCase() || defaultOpsEmail();
  }
  if (urgency === 'blocking') {
    return process.env.DP_SUPPORT_BLOCKING_EMAIL?.trim().toLowerCase() || defaultOpsEmail();
  }
  return defaultOpsEmail();
}

function categoryLabel(category: string) {
  return String(category || 'general').replace(/_/g, ' ');
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[dp-support] RESEND_API_KEY not set; skipping email send');
    return { ok: false as const, error: 'resend_not_configured' };
  }

  const from =
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
      attachments: payload.attachments,
    }),
    signal: AbortSignal.timeout(15000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[dp-support] Resend failed', data);
    return { ok: false as const, error: 'send_failed' };
  }
  return { ok: true as const, id: data.id as string | undefined };
}

function buildAttachments(dataDir: string, ticket: SupportTicket) {
  if (!ticket.hasScreenshots || !ticket.attachments.length) return [];
  const out: Array<{ filename: string; content: string }> = [];
  for (const att of ticket.attachments) {
    const abs = attachmentAbsPath(dataDir, ticket.id, att.filename);
    if (!abs || !fs.existsSync(abs)) continue;
    try {
      const buf = fs.readFileSync(abs);
      if (!buf.length) continue;
      out.push({ filename: att.filename, content: buf.toString('base64') });
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function sendSupportTicketAlert(dataDir: string, ticket: SupportTicket) {
  const to = alertEmailForTicket(ticket);
  const subject = `[DP Support · ${ticket.urgency}] ${ticket.subject}`;
  const html = `
    <h2>New Desirable Properties support request</h2>
    <p><strong>Ticket:</strong> ${ticket.id}</p>
    <p><strong>Category:</strong> ${categoryLabel(ticket.category)}</p>
    <p><strong>Urgency:</strong> ${ticket.urgency}</p>
    <p><strong>From:</strong> ${ticket.handle || ticket.email || ticket.userId || 'unknown'}</p>
    <p><strong>Page:</strong> ${ticket.pageUrl || '—'}</p>
    <hr />
    <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${ticket.body}</pre>
  `;

  return sendViaResend({
    to,
    subject,
    html,
    attachments: buildAttachments(dataDir, ticket),
  });
}
