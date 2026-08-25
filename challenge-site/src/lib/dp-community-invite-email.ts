function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendViaResend(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.warn('[dp-community-invite] RESEND_API_KEY not set; skipping email send');
    return { ok: false as const, error: 'resend_not_configured' as const };
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
      text: payload.text,
      tags: [{ name: 'category', value: 'community_chat_invite' }],
    }),
    signal: AbortSignal.timeout(20000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[dp-community-invite] Resend failed', data);
    return { ok: false as const, error: 'send_failed' as const };
  }
  return { ok: true as const, id: data.id as string | undefined };
}

export type CommunityInviteEmailRecipient = {
  email?: string | null;
};

export type CommunityInviteEmailResult = {
  sent: number;
  failed: number;
  skippedNoEmail: number;
  resendConfigured: boolean;
};

export function buildCommunityInviteEmailContent(args: {
  inviterName: string;
  chatTitle: string;
  inviteMessage?: string;
  agentUrl: string;
}): { subject: string; html: string; text: string } {
  const inviter = escapeHtml(args.inviterName.trim() || 'Someone');
  const title = escapeHtml(args.chatTitle.trim() || 'Community Chat');
  const agentUrl = escapeHtml(args.agentUrl.replace(/\/$/, ''));
  const message = String(args.inviteMessage || '').trim();
  const messageHtml = message
    ? `<blockquote style="margin:1.25em 0;padding:0.75em 1em;border-left:3px solid #0891b2;background:#f0f9ff;color:#0f172a;">${escapeHtml(message).replace(/\n/g, '<br>')}</blockquote>`
    : '';
  const messageText = message ? `\n\n${inviter} wrote:\n${message}\n` : '';

  const subject = `${args.inviterName.trim() || 'Someone'} invited you to a Community Chat on Deepi`;

  const html = `<!DOCTYPE html><html><body style="font-family:Georgia,serif;line-height:1.6;color:#111;max-width:36em;">
<p>Hello,</p>
<p><strong>${inviter}</strong> invited you to join <strong>${title}</strong> on Deepi (Desirable Properties Community AI).</p>
${messageHtml}
<p>Open Deepi, sign in with the same account, and look under <strong>Shared → With me</strong> in the sidebar. You can read the thread and prompt Deepi with the group.</p>
<p style="margin:2em 0;">
  <a href="${agentUrl}" style="display:inline-block;padding:0.65em 1.25em;background:#0e7490;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,sans-serif;font-size:15px;">Open Deepi</a>
</p>
<p style="font-size:13px;color:#555;">Direct link: <a href="${agentUrl}">${agentUrl}</a></p>
<p style="margin-top:2em;font-size:12px;color:#666;">Desirable Properties · Community Chat invite</p>
</body></html>`;

  const text = `Hello,

${args.inviterName.trim() || 'Someone'} invited you to join "${args.chatTitle.trim() || 'Community Chat'}" on Deepi (Desirable Properties Community AI).${messageText}

Open Deepi and sign in: ${args.agentUrl.replace(/\/$/, '')}
Then check Shared → With me in the sidebar.

Desirable Properties · Community Chat invite`;

  return { subject, html, text };
}

export async function sendCommunityChatInviteEmails(args: {
  recipients: CommunityInviteEmailRecipient[];
  inviterName: string;
  chatTitle: string;
  inviteMessage?: string;
}): Promise<CommunityInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const resendConfigured = Boolean(apiKey);
  const base = String(process.env.DP_PUBLIC_BASE || 'https://desirableproperties.org').replace(/\/$/, '');
  const agentUrl = `${base}/agent`;

  const seen = new Set<string>();
  const targets: string[] = [];
  let skippedNoEmail = 0;
  for (const row of args.recipients) {
    const email = String(row.email || '').trim().toLowerCase();
    if (!isValidEmail(email)) {
      skippedNoEmail += 1;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    targets.push(email);
  }

  if (!targets.length) {
    return { sent: 0, failed: 0, skippedNoEmail, resendConfigured };
  }

  const { subject, html, text } = buildCommunityInviteEmailContent({
    inviterName: args.inviterName,
    chatTitle: args.chatTitle,
    inviteMessage: args.inviteMessage,
    agentUrl,
  });

  let sent = 0;
  let failed = 0;
  for (const to of targets) {
    const result = await sendViaResend({ to, subject, html, text });
    if (result.ok) sent += 1;
    else failed += 1;
  }

  return { sent, failed, skippedNoEmail, resendConfigured };
}
