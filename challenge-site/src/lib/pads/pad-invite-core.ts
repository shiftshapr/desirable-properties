/**
 * "Invite others" on every pad (owner, 21 Nov 2026: "The Pad should also enable someone to invite others via several
 * means incl email"). Pure (no runtime imports), so scripts/pad-invite.test.mjs drives it with fake dependencies;
 * src/lib/pads/pad-invite.server.ts wires in the session, the store, Resend and the pad lookup.
 *
 * What a pad gives the panel: an InviteContent (title, a short plain summary, the current call to action, the path).
 * Proposal pads build it from the proposal and its plain-language summary, session pages from the meeting's title,
 * date and phase. Meeting pads (later) only need their own builder.
 *
 * Links carry ?ref=inv-<channel> so arrivals can be counted per channel. The ref names the channel only, never a
 * person or an address.
 *
 * "Send from the site" (signed-in accounts only):
 *   at most INVITE_LIMITS.perSend recipients per send and INVITE_LIMITS.perAccountPerDay per account per 24 hours;
 *   one invitation per address per pad every INVITE_LIMITS.samePadDays days, and INVITE_LIMITS.perRecipientPerDay
 *   per address per day from all senders; INVITE_LIMITS.sitePerDay for the whole site.
 *   Opted-out addresses are skipped. Only an HMAC of each address is stored, for those limits; nobody is added to a
 *   list. Every email names the sender, says why it came and carries an opt-out link.
 */

export type PadInviteKind = 'proposal' | 'session' | 'meeting' | 'bookclub';

export type InviteContent = {
  kind: PadInviteKind;
  /** Stable id of the pad: the proposal id, or the session page path. */
  key: string;
  /** Site path of the pad, e.g. /pads/proposals/3275bc04. */
  path: string;
  title: string;
  /** One or two plain sentences, already short. */
  summary: string;
  /** The call to action, starting with a verb: "Read it and add your view". */
  action: string;
  /** Email subject for the mailto link. */
  subject: string;
};

export const INVITE_CHANNELS = [
  'link',
  'share',
  'qr',
  'email',
  'site',
  'whatsapp',
  'telegram',
  'linkedin',
  'x',
  'bluesky',
  'signal',
] as const;
export type InviteChannel = (typeof INVITE_CHANNELS)[number];

export const INVITE_LIMITS = {
  perSend: 5,
  perAccountPerDay: 20,
  /** Sends (not recipients) per account in ten minutes. */
  burstSends: 5,
  burstWindowMs: 10 * 60_000,
  perRecipientPerDay: 3,
  samePadDays: 30,
  sitePerDay: 300,
  noteMax: 280,
  /** Rows older than this are deleted: nothing older is needed for any limit. */
  keepDays: 35,
} as const;

const REF_PREFIX = 'inv-';

/** The ref value for a channel, or null when the raw value is not one of ours. */
export function parseRef(raw: unknown): InviteChannel | null {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s.startsWith(REF_PREFIX)) return null;
  const ch = s.slice(REF_PREFIX.length);
  return (INVITE_CHANNELS as readonly string[]).includes(ch) ? (ch as InviteChannel) : null;
}

/** The pad's public URL with the channel's ref. */
export function inviteUrl(base: string, path: string, channel: InviteChannel): string {
  const b = String(base || '').replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  const [beforeHash, hash] = p.split('#');
  const sep = beforeHash.includes('?') ? '&' : '?';
  return `${b}${beforeHash}${sep}ref=${REF_PREFIX}${channel}${hash ? `#${hash}` : ''}`;
}

/** Collapse whitespace and cut at a sentence (or word) boundary, at most `max` characters. */
export function shorten(text: string, max: number): string {
  const flat = String(text || '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const sentence = cut.lastIndexOf('. ');
  if (sentence >= max * 0.5) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(' ');
  return `${(word > 0 ? cut.slice(0, word) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

/* ---------- content builders ---------- */

export function proposalInvite(input: {
  id: string;
  path: string;
  title: string;
  summary: string | null;
  where: string;
  status: string;
}): InviteContent {
  const open = String(input.status || '').toLowerCase() === 'pending';
  const summary = shorten(input.summary || `A proposed change to ${input.where} in The Layered Web.`, 240);
  return {
    kind: 'proposal',
    key: input.id,
    path: input.path,
    title: shorten(input.title, 120),
    summary,
    action: open ? 'Read it and add your view before the co-editors decide' : 'See what was proposed and how it was decided',
    subject: shorten(`A proposed change to ${input.where}: ${input.title}`, 140),
  };
}

export type SessionInviteEvent = {
  date: string;
  startsAt: string;
  endsAt: string;
  meetingTitle: string | null;
  title: string;
  seriesTitle: string;
  objective: string;
  thisWeek: string | null;
  clockShort: string;
  pageHref: string | null;
  href: string;
};

/** "Monday 23 November", read in Pacific time (sessions are scheduled in Pacific time). */
export function sessionDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Los_Angeles' });
}

export function sessionInvite(input: {
  event: SessionInviteEvent;
  /** The page being shared: the session page, or /roundups/<date> before it has one. */
  path: string;
  now: Date;
  /** The session's ballot, when it has one. */
  ballot?: { status: 'not_open' | 'open' | 'closed' | 'published'; closesLabel: string } | null;
}): InviteContent {
  const { event, now, ballot } = input;
  const title = shorten(event.meetingTitle || event.title, 120);
  const day = sessionDay(event.startsAt);
  const upcoming = now < new Date(event.startsAt);
  const live = !upcoming && now < new Date(event.endsAt);
  let action: string;
  if (ballot?.status === 'open') action = `Vote on what the meeting proposed, open until ${ballot.closesLabel}`;
  else if (upcoming) action = `Join us on ${day}, ${event.clockShort}, on Zoom (register on the page)`;
  else if (live) action = 'Join now on Zoom (the link is on the page)';
  else if (ballot?.status === 'published' || ballot?.status === 'closed') action = 'See the record and the vote results';
  else action = 'Read the record and what comes next';
  const summary = shorten(event.thisWeek || event.objective, 240);
  return {
    kind: 'session',
    key: input.path,
    path: input.path,
    title,
    summary,
    action,
    subject: shorten(upcoming ? `Join me: ${title}, ${day}` : `${title} (${day})`, 140),
  };
}

/** A meeting pad's invite (/pads/meetings/<slug>): its date and title, the pad's own short summary. */
export function meetingInvite(input: { path: string; dateLabel: string; title: string; summary: string }): InviteContent {
  const title = shorten(`${input.dateLabel} · ${input.title}`, 120);
  return {
    kind: 'meeting',
    key: input.path,
    path: input.path,
    title,
    summary: shorten(input.summary, 240),
    action: 'See what was raised and what changed',
    subject: shorten(`Meeting pad: ${title}`, 140),
  };
}

/** The book club pad's invite: the meeting being read next (or last), and the call to join. */
export function bookClubInvite(input: { path: string; title: string; chapter: string; dateLabel: string; past: boolean }): InviteContent {
  const title = shorten(`${input.title}: ${input.chapter}, ${input.dateLabel}`, 120);
  return {
    kind: 'bookclub',
    key: input.path,
    path: input.path,
    title,
    summary: shorten(
      input.past
        ? `We read ${input.chapter} of The Layered Web together. The summary, proposals and chat are on the pad.`
        : `We're reading ${input.chapter} of The Layered Web together. Everyone is welcome; bring a question or an insight.`,
      240,
    ),
    action: input.past ? 'See what the book club discussed' : 'Get the reading and join',
    subject: shorten(`Book club: ${title}`, 140),
  };
}

/* ---------- messages and links ---------- */

/** The message people send: title, short summary, the action and the link. Plain, a few lines. */
export function inviteMessage(c: InviteContent, url: string, opts: { short?: boolean } = {}): string {
  if (opts.short) return `${c.title}. ${c.action}: ${url}`;
  return `${c.title}\n\n${c.summary}\n\n${c.action}: ${url}`;
}

export function mailtoHref(c: InviteContent, base: string): string {
  const url = inviteUrl(base, c.path, 'email');
  const body = `Hi,\n\nI thought you would want to see this on Desirable Properties, where a community is writing The Layered Web together.\n\n${inviteMessage(c, url)}\n`;
  return `mailto:?subject=${encodeURIComponent(c.subject)}&body=${encodeURIComponent(body)}`;
}

export type ShareLink = { key: InviteChannel; label: string; href: string };

/** Prefilled share links. Plain URLs, no third-party scripts. Signal has no web share URL: the panel copies a message. */
export function shareLinks(c: InviteContent, base: string): ShareLink[] {
  const u = (ch: InviteChannel) => inviteUrl(base, c.path, ch);
  const enc = encodeURIComponent;
  const lead = `${c.title}. ${c.action}.`;
  return [
    { key: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${enc(inviteMessage(c, u('whatsapp')))}` },
    {
      key: 'telegram',
      label: 'Telegram',
      href: `https://t.me/share/url?url=${enc(u('telegram'))}&text=${enc(`${c.title}\n\n${c.summary}\n\n${c.action}.`)}`,
    },
    { key: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u('linkedin'))}` },
    { key: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${enc(shorten(lead, 230))}&url=${enc(u('x'))}` },
    { key: 'bluesky', label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${enc(`${shorten(lead, 240)} ${u('bluesky')}`)}` },
  ];
}

export function signalMessage(c: InviteContent, base: string): string {
  return inviteMessage(c, inviteUrl(base, c.path, 'signal'));
}

/* ---------- send from the site ---------- */

const EMAIL_RE = /^[^\s@<>(),;:"']+@[^\s@<>(),;:"']+\.[a-z]{2,}$/i;
const URLISH_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|org|net|io|xyz|ru|info|biz|co|me|app|link|ly)\b)/i;

export function parseRecipients(raw: unknown): { ok: true; emails: string[] } | { ok: false; error: string } {
  const list = Array.isArray(raw) ? raw.map(String) : String(raw ?? '').split(/[\s,;]+/);
  const emails = [...new Set(list.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!emails.length) return { ok: false, error: 'Add at least one email address.' };
  const bad = emails.filter((e) => e.length > 254 || !EMAIL_RE.test(e));
  if (bad.length) return { ok: false, error: `This does not look like an email address: ${bad[0].slice(0, 80)}` };
  if (emails.length > INVITE_LIMITS.perSend) {
    return { ok: false, error: `Up to ${INVITE_LIMITS.perSend} addresses at a time.` };
  }
  return { ok: true, emails };
}

/** The optional personal note: one paragraph, plain text, no links (so the site cannot be used to send links). */
export function parseNote(raw: unknown): { ok: true; note: string | null } | { ok: false; error: string } {
  const flat = String(raw ?? '').replace(/\s+/g, ' ').trim();
  if (!flat) return { ok: true, note: null };
  if (flat.length > INVITE_LIMITS.noteMax) return { ok: false, error: `Keep the note under ${INVITE_LIMITS.noteMax} characters.` };
  if (URLISH_RE.test(flat)) return { ok: false, error: 'Leave links out of the note; the invitation already links to the page.' };
  return { ok: true, note: flat };
}

export function senderName(s: { displayName: string | null; username: string | null }): string | null {
  const n = String(s.displayName || s.username || '').replace(/\s+/g, ' ').replace(/[<>]/g, '').trim();
  return n ? n.slice(0, 60) : null;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const INVITE_FOOTER =
  'You got this because {sender} typed your address on desirableproperties.org to invite you to this page. You have not been added to any list. The site keeps only a one-way hash of your address, to stop repeat invitations.';

export function siteInviteEmail(input: {
  content: InviteContent;
  url: string;
  sender: string;
  note: string | null;
  optOutUrl: string;
}): { subject: string; html: string; text: string } {
  const { content: c, url, sender, note, optOutUrl } = input;
  const subject = shorten(`${sender} invited you: ${c.title}`, 140);
  const footer = INVITE_FOOTER.replace('{sender}', sender);
  const optOut = 'Stop all email from Desirable Properties';
  const text = [
    'Hi,',
    `${sender} invited you to a page on Desirable Properties, where a community is writing The Layered Web together.`,
    note ? `"${note}" (${sender})` : null,
    c.title,
    c.summary,
    `${c.action}: ${url}`,
    '--',
    `${footer} ${optOut}: ${optOutUrl}`,
  ]
    .filter(Boolean)
    .join('\n\n');
  const html = [
    '<p>Hi,</p>',
    `<p>${esc(sender)} invited you to a page on Desirable Properties, where a community is writing The Layered Web together.</p>`,
    note
      ? `<blockquote style="margin:1em 0;padding:0.5em 1em;border-left:3px solid #0891b2;color:#333;">${esc(note)}<br><span style="color:#666;font-size:13px;">${esc(sender)}</span></blockquote>`
      : '',
    `<p style="font-size:17px;"><strong>${esc(c.title)}</strong></p>`,
    `<p>${esc(c.summary)}</p>`,
    `<p><a href="${esc(url)}" style="display:inline-block;padding:10px 16px;background:#0891b2;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">${esc(c.action)}</a></p>`,
    `<p style="font-size:13px;color:#555;">Or open: <a href="${esc(url)}">${esc(url)}</a></p>`,
    `<p style="font-size:12px;color:#666;margin-top:2em;border-top:1px solid #ddd;padding-top:1em;">${esc(footer)} <a href="${esc(optOutUrl)}">${optOut}</a>.</p>`,
  ].join('');
  return { subject, html, text };
}

/* ---------- handlers ---------- */

export type InviteSession = { userId: string; displayName: string | null; username: string | null; email: string | null };

export type InviteDeps = {
  readSession: () => Promise<InviteSession | null>;
  /** The pad's invite content as the server sees it (never the client's copy), or null when there is no such pad. */
  resolveContent: (kind: PadInviteKind, key: string) => Promise<InviteContent | null>;
  hashEmail: (email: string) => string;
  isOptedOut: (email: string) => Promise<boolean>;
  /** Addresses this account tried in the last `sinceMs`. */
  senderCount: (userId: string, sinceMs: number) => Promise<number>;
  /** Invitations to this address hash in the last `sinceMs`, optionally for one pad only. */
  recipientCount: (hash: string, sinceMs: number, pad?: { kind: PadInviteKind; key: string }) => Promise<number>;
  siteCount: (sinceMs: number) => Promise<number>;
  record: (row: { senderId: string; hash: string; kind: PadInviteKind; key: string; outcome: 'sent' | 'skipped' | 'failed' }) => Promise<void>;
  optOutUrl: (email: string) => Promise<string | null>;
  send: (mail: { to: string; subject: string; html: string; text: string; unsubscribeUrl: string }) => Promise<{ ok: boolean; error?: string }>;
  allowHit: (key: string, max: number, windowMs: number) => boolean;
  base: string;
  enabled: boolean;
};

type Reply = { status: number; body: Record<string, unknown> };

const DAY = 24 * 3600_000;

export function parsePadRef(body: Record<string, unknown>): { kind: PadInviteKind; key: string } | null {
  const kind = String(body.kind ?? '');
  const key = String(body.key ?? '').trim();
  if (kind !== 'proposal' && kind !== 'session' && kind !== 'meeting' && kind !== 'bookclub') return null;
  if (!key || key.length > 200) return null;
  if (kind === 'proposal' && !/^[0-9a-f-]{8,36}$/i.test(key)) return null;
  if (kind !== 'proposal' && !/^\/[a-z0-9/_-]+$/i.test(key)) return null;
  return { kind, key };
}

/** What the panel needs: signed in, the name invitations go out under, and how many addresses are left today. */
export async function handleInviteGet(deps: InviteDeps): Promise<Reply> {
  const session = await deps.readSession();
  if (!session) return { status: 200, body: { signedIn: false, enabled: deps.enabled } };
  const used = await deps.senderCount(session.userId, DAY);
  return {
    status: 200,
    body: {
      signedIn: true,
      enabled: deps.enabled,
      sender: senderName(session),
      remainingToday: Math.max(0, INVITE_LIMITS.perAccountPerDay - used),
      perSend: INVITE_LIMITS.perSend,
      perDay: INVITE_LIMITS.perAccountPerDay,
    },
  };
}

export async function handleInviteSend(deps: InviteDeps, raw: unknown): Promise<Reply> {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  if (!deps.enabled) return { status: 503, body: { error: 'Sending invitations from the site is switched off. Use email or a share link instead.' } };
  const session = await deps.readSession();
  if (!session) return { status: 401, body: { error: 'Sign in to send invitations from the site', code: 'sign_in' } };
  const sender = senderName(session);
  if (!sender) return { status: 409, body: { error: 'Add a display name to your account first, so people know who invited them.' } };
  if (!deps.allowHit(`pad-invite:${session.userId}`, INVITE_LIMITS.burstSends, INVITE_LIMITS.burstWindowMs)) {
    return { status: 429, body: { error: 'Too many sends in a few minutes; wait a little and try again.' } };
  }
  const ref = parsePadRef(body);
  if (!ref) return { status: 400, body: { error: 'Which pad?' } };
  const recipients = parseRecipients(body.to);
  if (!recipients.ok) return { status: 400, body: { error: recipients.error } };
  const note = parseNote(body.note);
  if (!note.ok) return { status: 400, body: { error: note.error } };

  const used = await deps.senderCount(session.userId, DAY);
  const left = INVITE_LIMITS.perAccountPerDay - used;
  if (recipients.emails.length > left) {
    return {
      status: 429,
      body: {
        error: left > 0 ? `You can invite ${left} more ${left === 1 ? 'person' : 'people'} today.` : `You have sent the ${INVITE_LIMITS.perAccountPerDay} invitations allowed today. Try again tomorrow.`,
        remainingToday: Math.max(0, left),
      },
    };
  }
  if ((await deps.siteCount(DAY)) + recipients.emails.length > INVITE_LIMITS.sitePerDay) {
    return { status: 429, body: { error: 'The site has sent its invitations for today. Use email or a share link instead.' } };
  }
  const content = await deps.resolveContent(ref.kind, ref.key);
  if (!content) return { status: 404, body: { error: 'No such pad' } };

  const url = inviteUrl(deps.base, content.path, 'site');
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const email of recipients.emails) {
    const hash = deps.hashEmail(email);
    const recent =
      (await deps.recipientCount(hash, INVITE_LIMITS.samePadDays * DAY, { kind: ref.kind, key: content.key })) > 0 ||
      (await deps.recipientCount(hash, DAY)) >= INVITE_LIMITS.perRecipientPerDay;
    if (recent || (await deps.isOptedOut(email))) {
      skipped += 1;
      await deps.record({ senderId: session.userId, hash, kind: ref.kind, key: content.key, outcome: 'skipped' });
      continue;
    }
    const optOutUrl = await deps.optOutUrl(email);
    if (!optOutUrl) {
      failed += 1;
      continue;
    }
    const mail = siteInviteEmail({ content, url, sender, note: note.note, optOutUrl });
    const r = await deps.send({ to: email, ...mail, unsubscribeUrl: optOutUrl });
    if (r.ok) sent += 1;
    else failed += 1;
    await deps.record({ senderId: session.userId, hash, kind: ref.kind, key: content.key, outcome: r.ok ? 'sent' : 'failed' });
  }
  return {
    status: 200,
    body: {
      ok: true,
      sent,
      skipped,
      failed,
      remainingToday: Math.max(0, left - recipients.emails.length),
    },
  };
}

/** One line for the sender. Skipped addresses are counted, never named (that would reveal who opted out). */
export function sendResultLine(r: { sent: number; skipped: number; failed: number }): string {
  const parts: string[] = [];
  parts.push(r.sent ? `Sent ${r.sent} ${r.sent === 1 ? 'invitation' : 'invitations'}.` : 'Nothing sent.');
  if (r.skipped) parts.push(`${r.skipped} skipped: invited to this pad recently, or they asked for no email from the site.`);
  if (r.failed) parts.push(`${r.failed} could not be sent; try again later.`);
  return parts.join(' ');
}

/* ---------- QR ---------- */

/** One SVG path ("M x y h1 v1 h-1 z" per dark module) for a QR matrix, offset by a quiet zone of `margin` modules. */
export function qrPath(count: number, isDark: (row: number, col: number) => boolean, margin = 4): string {
  const parts: string[] = [];
  for (let r = 0; r < count; r += 1) {
    for (let c = 0; c < count; c += 1) {
      if (isDark(r, c)) parts.push(`M${c + margin} ${r + margin}h1v1h-1z`);
    }
  }
  return parts.join('');
}
