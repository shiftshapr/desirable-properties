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

async function buildAttachments(dataDir: string, ticket: SupportTicket) {
  if (!ticket.hasScreenshots || !ticket.attachments.length) return [];
  const out: Array<{ filename: string; content: string }> = [];
  for (const att of ticket.attachments) {
    const abs = await attachmentAbsPath(dataDir, ticket.id, att.filename);
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
  const adminBase = String(process.env.DP_PUBLIC_BASE || 'https://desirableproperties.org').replace(/\/$/, '');
  const subject = `[DP Support · ${ticket.urgency}] ${ticket.subject}`;
  const html = `
    <h2>New Desirable Properties support request</h2>
    <p><strong>Ticket:</strong> ${ticket.id}</p>
    <p><strong>Category:</strong> ${categoryLabel(ticket.category)}</p>
    <p><strong>Urgency:</strong> ${ticket.urgency}</p>
    <p><strong>From:</strong> ${ticket.handle || ticket.email || ticket.userId || 'unknown'}</p>
    <p><strong>Page:</strong> ${ticket.pageUrl || '–'}</p>
    <p><strong>Admin:</strong> <a href="${adminBase}/admin?tab=support">${adminBase}/admin?tab=support</a></p>
    <hr />
    <pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${ticket.body}</pre>
  `;

  return sendViaResend({
    to,
    subject,
    html,
    attachments: await buildAttachments(dataDir, ticket),
  });
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendSupportTicketAck(ticket: SupportTicket) {
  const to = String(ticket.email || '').trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false as const, error: 'ticket_missing_email' };
  }

  const base = String(process.env.DP_PUBLIC_BASE || 'https://desirableproperties.org').replace(/\/$/, '');
  const subject = `We received your support request: ${ticket.subject}`;

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;line-height:1.6;color:#111;">
<p>Hello,</p>
<p>We received your support request (reference <code>${escapeHtml(ticket.id)}</code>).</p>
<p><strong>${escapeHtml(ticket.subject)}</strong></p>
<p>Our team will review it and follow up soon. When signed in, track status at <a href="${escapeHtml(`${base}/support`)}">${escapeHtml(`${base}/support`)}</a>.</p>
<p style="margin-top:2em;font-size:12px;color:#666;">Desirable Properties support</p>
</body></html>`;

  return sendViaResend({ to, subject, html });
}

export async function sendSupportReplyEmail(
  ticket: SupportTicket,
  args: { subject?: string; body?: string } = {},
) {
  const to = String(ticket.email || '').trim().toLowerCase();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false as const, error: 'ticket_missing_email' };
  }

  const subject =
    String(args.subject || ticket.draftReply?.subject || '').trim()
    || `Re: ${String(ticket.subject || 'Desirable Properties support').trim()}`;
  const body = String(args.body || ticket.draftReply?.body || '').trim();
  if (!body) return { ok: false as const, error: 'reply_body_required' };

  const ticketRef = ticket.id ? `\n\n – \nTicket reference: ${ticket.id}` : '';
  const htmlBody = escapeHtml(body).replace(/\n/g, '<br>\n');
  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;line-height:1.6;color:#111;">
${htmlBody}
<p style="margin-top:2em;font-size:12px;color:#666;">Desirable Properties support${ticket.id ? ` · ref ${escapeHtml(ticket.id)}` : ''}</p>
</body></html>`;

  return sendViaResend({
    to,
    subject,
    html: html,
  });
}
