/**
 * Follow sweep: every SWEEP_INTERVAL_MS, read the status of each followed proposal from Gov Hub's public proposal
 * list (one request per document) and email each follower whose pad changed status since they last heard. Started
 * from instrumentation-node.ts next to the Review checks sweep.
 *
 * Off unless PAD_FOLLOW_EMAILS=on (pad-settings.ts): with it off the sweep does nothing, so follows keep their last
 * status and the first run after it is turned on sends what changed meanwhile.
 *
 * Every email carries a token unsubscribe link (/api/broadcast/unsubscribe, dp-broadcast-preferences-store.ts), and
 * accounts or emails that have opted out of Desirable Properties email are skipped (their follow is still marked as
 * up to date, so they are not retried).
 */
import 'server-only';
import {
  ensureEmailUnsubscribeToken,
  ensureUnsubscribeToken,
  isEmailOptedOut,
  isUserOptedOut,
} from '@/lib/dp-broadcast-preferences-store';
import { isCanopiUserId } from '@/lib/dp-canopi-user';
import { followEmail, statusChanges } from '@/lib/pads/pad-community-core';
import { padFollowEmailsOn } from '@/lib/pads/pad-settings';
import { allFollows, markNotified } from '@/lib/pads/pad-store.server';
import { currentStatuses, PAD_DOCS } from '@/lib/pads/proposal-pad.server';
import { padHref, shortId } from '@/lib/pads/proposal-pad-core';
import summaries from '@/data/proposal-pad-summaries.json';

export const PAD_FOLLOW_SWEEP_INTERVAL_MS = 15 * 60_000;

function publicBase(): string {
  return (process.env.DP_PUBLIC_BASE?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://desirableproperties.org').replace(/\/$/, '');
}

async function sendViaResend(p: { to: string; subject: string; html: string; text: string; unsubscribeUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false as const, error: 'resend_not_configured' };
  const from =
    process.env.DP_BROADCAST_FROM?.trim() ||
    process.env.DP_SUPPORT_FROM?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    'Desirable Properties <noreply@desirableproperties.org>';
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
      tags: [{ name: 'kind', value: 'pad_follow' }],
    }),
    signal: AbortSignal.timeout(20000),
  });
  return res.ok ? { ok: true as const } : { ok: false as const, error: `resend_${res.status}` };
}

async function unsubscribeUrlFor(userId: string, email: string): Promise<string> {
  const base = `${publicBase()}/api/broadcast/unsubscribe`;
  if (isCanopiUserId(userId)) {
    const t = await ensureUnsubscribeToken(userId, email);
    if (t.ok && t.token) return `${base}?token=${encodeURIComponent(t.token)}`;
  }
  const t = await ensureEmailUnsubscribeToken(email, isCanopiUserId(userId) ? userId : null);
  return t.ok ? `${base}?token=${encodeURIComponent(t.token)}` : base;
}

let running: Promise<{ checked: number; sent: number; skipped: number }> | null = null;

export async function sweepPadFollows(): Promise<{ checked: number; sent: number; skipped: number }> {
  if (!padFollowEmailsOn(process.env.PAD_FOLLOW_EMAILS)) return { checked: 0, sent: 0, skipped: 0 };
  if (running) return running;
  running = (async () => {
    const follows = await allFollows('proposal');
    const byMl = new Map<string, typeof follows>();
    for (const f of follows) byMl.set(f.ml_number, [...(byMl.get(f.ml_number) || []), f]);
    let sent = 0;
    let skipped = 0;
    for (const [ml, rows] of byMl) {
      const current = await currentStatuses(ml);
      if (!current) continue;
      const docLabel = PAD_DOCS.find((d) => d.mlNumber === ml)?.label || ml;
      for (const { follow, to } of statusChanges(rows, current)) {
        const optedOut =
          (isCanopiUserId(follow.user_id) && (await isUserOptedOut(follow.user_id))) || (await isEmailOptedOut(follow.email));
        if (optedOut) {
          skipped += 1;
          await markNotified('proposal', follow.pad_id, follow.user_id, to);
          continue;
        }
        const stored = (summaries as { items: Record<string, { title?: string }> }).items?.[follow.pad_id];
        const unsubscribeUrl = await unsubscribeUrlFor(follow.user_id, follow.email);
        const mail = followEmail({
          padUrl: `${publicBase()}${padHref(follow.pad_id)}`,
          unsubscribeUrl,
          padTitle: stored?.title || `Proposal ${shortId(follow.pad_id)}`,
          docLabel,
          to,
          name: follow.display_name,
        });
        const result = await sendViaResend({ to: follow.email, ...mail, unsubscribeUrl });
        if (result.ok) {
          sent += 1;
          await markNotified('proposal', follow.pad_id, follow.user_id, to);
        } else {
          console.warn('[pad-follow] send failed', result.error);
        }
      }
    }
    return { checked: follows.length, sent, skipped };
  })().finally(() => {
    running = null;
  });
  return running;
}
