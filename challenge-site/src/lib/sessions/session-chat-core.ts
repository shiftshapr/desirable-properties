/**
 * Session chat: one chat thread per listening-session occurrence, on that session's own page.
 *
 * Storage reuses the Community Chat message table (dp_community_chat_message, DP Postgres), whose rows are keyed by a
 * free-text `community_thread_id`. A session thread is keyed `session:<slug>`, so it cannot collide with a Hermes
 * community thread (`hermes-thread-…`) or a workgroup (Gov Hub workgroup chat is a different store, keyed by
 * workgroup id). No new table and no migration.
 *
 * Rules (owner, 17 Nov 2026): reading and posting both need sign-in, enforced here on the server; any signed-in
 * account may post (no workgroup membership); messages show the display name, never an email; no time gate; no
 * Hermes/AI assist. Not behind DP_LISTENING_WORKSPACE.
 *
 * This file is pure (no runtime imports), so scripts/session-chat.test.mjs can drive the handlers with fake
 * dependencies. The route files under src/app/api/sessions/[slug]/chat/ wire in the real session reader and store.
 */

/** Session occurrences that have a chat. Add a slug when a new occurrence page gets one. */
export const SESSION_CHAT_SLUGS: readonly string[] = [
  'meta-governance-2026-11-16',
  'listening-2026-11-23',
];

/** Overweb Book Club: one thread per meeting, book-club-<YYYY-MM-DD> (src/data/book-club.ts, /pads/book-club). */
const BOOK_CLUB_CHAT_RE = /^book-club-20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Same body limit as Community Chat and workgroup chat (8,000 characters). */
export const SESSION_CHAT_MAX_BODY = 8000;
/** Latest messages returned per read. */
export const SESSION_CHAT_PAGE = 200;
/** Same posting limits as listening-workspace contributions; reads allow a 5-second poll with headroom. */
export const SESSION_CHAT_LIMITS = { postsPerMinute: 6, postsPerHour: 60, readsPerMinute: 60 };
/** How often the page polls for new messages. */
export const SESSION_CHAT_POLL_MS = 5000;

export function sessionChatThreadKey(slug: string | null | undefined): string | null {
  const s = String(slug || '').trim();
  return SESSION_CHAT_SLUGS.includes(s) || BOOK_CLUB_CHAT_RE.test(s) ? `session:${s}` : null;
}

export type SessionChatViewer = {
  userId: string;
  username: string;
  displayName: string | null;
  email?: string | null;
};

export type SessionChatMessage = {
  id: string;
  community_thread_id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  source: 'human' | 'deepi_shared';
  created_at: string;
  edited_at: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The name shown on a message: display name, else username, never anything that looks like an email. */
export function publicAuthorName(viewer: Pick<SessionChatViewer, 'displayName' | 'username'>): string {
  for (const raw of [viewer.displayName, viewer.username]) {
    const v = String(raw || '').trim();
    if (v && !EMAIL_RE.test(v) && !v.includes('@')) return v.slice(0, 200);
  }
  return 'Member';
}

/** Plain text: strip control characters (keep newlines and tabs) and trim. */
export function cleanChatBody(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
}

/** Same-origin check: a browser always sends Origin on a cross-site POST. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  try {
    return new URL(origin).host === host.split(',')[0].trim();
  } catch {
    return false;
  }
}

export type SessionChatDeps = {
  readSession: () => Promise<SessionChatViewer | null>;
  list: (threadKey: string, limit: number) => Promise<SessionChatMessage[]>;
  create: (input: { threadKey: string; authorUserId: string; authorName: string; body: string }) => Promise<SessionChatMessage>;
  update: (input: { threadKey: string; messageId: string; authorUserId: string; body: string }) => Promise<SessionChatMessage | null>;
  /** True when one more hit fits in the window (records it). */
  allowHit: (key: string, max: number, windowMs: number) => boolean;
};

const NO_STORE = { 'Cache-Control': 'no-store' };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function fail(status: number, code: string, message: string): Response {
  return json({ error: message, code }, status);
}

/** What leaves the server: no thread key internals beyond the message itself, never an email. */
function present(m: SessionChatMessage): SessionChatMessage {
  return {
    id: m.id,
    community_thread_id: m.community_thread_id,
    author_user_id: m.author_user_id,
    author_name: EMAIL_RE.test(m.author_name.trim()) || m.author_name.includes('@') ? 'Member' : m.author_name,
    body: m.body,
    source: m.source,
    created_at: m.created_at,
    edited_at: m.edited_at,
  };
}

async function signedIn(deps: SessionChatDeps): Promise<SessionChatViewer | null> {
  try {
    const s = await deps.readSession();
    return s && String(s.userId || '').trim() ? s : null;
  } catch {
    return null;
  }
}

/** GET /api/sessions/<slug>/chat: the latest messages. 404 unknown session, 401 signed out. */
export async function handleSessionChatGet(slug: string, deps: SessionChatDeps): Promise<Response> {
  const threadKey = sessionChatThreadKey(slug);
  if (!threadKey) return fail(404, 'not_found', 'No chat for this session');
  const viewer = await signedIn(deps);
  if (!viewer) return fail(401, 'sign_in_required', 'Sign in to join the session chat');
  if (!deps.allowHit(`session-chat:read:${viewer.userId}`, SESSION_CHAT_LIMITS.readsPerMinute, 60_000)) {
    return fail(429, 'rate_limited', 'Too many requests. Wait a minute.');
  }
  const messages = await deps.list(threadKey, SESSION_CHAT_PAGE);
  return json({ messages: messages.map(present), can_post: true, thread: threadKey });
}

async function readBody(request: Request): Promise<string | null> {
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return null;
  const data = (await request.json().catch(() => null)) as { body?: unknown } | null;
  return data && typeof data === 'object' ? cleanChatBody(data.body) : null;
}

function checkPostable(request: Request, body: string | null): Response | null {
  if (!sameOrigin(request)) return fail(403, 'cross_origin', 'Cross-site request refused');
  if (body === null) return fail(415, 'json_required', 'Send JSON');
  if (!body) return fail(400, 'body_required', 'Message body required');
  if (body.length > SESSION_CHAT_MAX_BODY) {
    return fail(400, 'too_long', `Message is too long (max ${SESSION_CHAT_MAX_BODY} characters)`);
  }
  return null;
}

/** POST /api/sessions/<slug>/chat {body}: any signed-in account may post. */
export async function handleSessionChatPost(request: Request, slug: string, deps: SessionChatDeps): Promise<Response> {
  const threadKey = sessionChatThreadKey(slug);
  if (!threadKey) return fail(404, 'not_found', 'No chat for this session');
  const viewer = await signedIn(deps);
  if (!viewer) return fail(401, 'sign_in_required', 'Sign in to join the session chat');
  const body = await readBody(request);
  const bad = checkPostable(request, body);
  if (bad) return bad;
  const minuteOk = deps.allowHit(`session-chat:post:m:${viewer.userId}`, SESSION_CHAT_LIMITS.postsPerMinute, 60_000);
  const hourOk = minuteOk && deps.allowHit(`session-chat:post:h:${viewer.userId}`, SESSION_CHAT_LIMITS.postsPerHour, 3_600_000);
  if (!minuteOk || !hourOk) {
    return fail(429, 'rate_limited', 'You are posting very quickly. Wait a minute and try again.');
  }
  const message = await deps.create({
    threadKey,
    authorUserId: viewer.userId,
    authorName: publicAuthorName(viewer),
    body: body as string,
  });
  return json({ success: true, message: present(message) }, 201);
}

/** PATCH /api/sessions/<slug>/chat/<messageId> {body}: authors edit their own messages (as in Community Chat). */
export async function handleSessionChatPatch(
  request: Request,
  slug: string,
  messageId: string,
  deps: SessionChatDeps,
): Promise<Response> {
  const threadKey = sessionChatThreadKey(slug);
  if (!threadKey) return fail(404, 'not_found', 'No chat for this session');
  const viewer = await signedIn(deps);
  if (!viewer) return fail(401, 'sign_in_required', 'Sign in to join the session chat');
  const id = String(messageId || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail(404, 'not_found', 'Message not found');
  const body = await readBody(request);
  const bad = checkPostable(request, body);
  if (bad) return bad;
  if (!deps.allowHit(`session-chat:post:m:${viewer.userId}`, SESSION_CHAT_LIMITS.postsPerMinute, 60_000)) {
    return fail(429, 'rate_limited', 'You are editing very quickly. Wait a minute and try again.');
  }
  const message = await deps.update({ threadKey, messageId: id, authorUserId: viewer.userId, body: body as string });
  if (!message) return fail(404, 'not_found', 'Message not found or not editable');
  return json({ success: true, message: present(message) });
}
