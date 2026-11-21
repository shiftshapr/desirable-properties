/**
 * Pad email through Resend: the follow sweep (pad-follow-sweep.server.ts) and "Send from the site" invitations
 * (pad-invite.server.ts) share the from address, the one-click unsubscribe headers and the public base URL.
 */
import 'server-only';

export function publicBase(): string {
  return (process.env.DP_PUBLIC_BASE?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://desirableproperties.org').replace(/\/$/, '');
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendPadEmail(p: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
  /** Resend tag, e.g. pad_follow or pad_invite. */
  kind: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, error: 'resend_not_configured' };
  const from =
    process.env.DP_BROADCAST_FROM?.trim() ||
    process.env.DP_SUPPORT_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Desirable Properties <noreply@desirableproperties.org>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [p.to],
        subject: p.subject,
        html: p.html,
        text: p.text,
        headers: { 'List-Unsubscribe': `<${p.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        tags: [{ name: 'kind', value: p.kind }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    return res.ok ? { ok: true } : { ok: false, error: `resend_${res.status}` };
  } catch {
    return { ok: false, error: 'resend_unreachable' };
  }
}
