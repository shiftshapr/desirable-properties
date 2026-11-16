/**
 * POST /api/listening/<slug>/actions: every workspace write goes through here.
 * Order: flag → same-origin JSON → meeting → sign-in → role → rate limit → validation → one transaction.
 */
import { NextResponse } from 'next/server';
import { canFacilitate, isAdministrator, resolveViewer, type ResolvedViewer } from '@/lib/listening/auth.server';
import { listeningWorkspaceEnabled } from '@/lib/listening/flag';
import { allowHit, CONTRIBUTION_LIMITS, FACILITATOR_LIMITS } from '@/lib/listening/rate-limit.server';
import { getMeetingBySlug, listeningPool, withMeetingTx, type Actor } from '@/lib/listening/store.server';
import {
  CARD_LABELS,
  CARD_TYPES,
  CONTRIBUTION_KINDS,
  LIMITS,
  MODERATION_ACTIONS,
  PHASES,
  RESERVED_ROLES,
  ROLES,
  TARGET_TYPES,
  type CardLabel,
  type CardType,
  type ContributionKind,
  type Meeting,
  type ModerationAction,
  type Phase,
  type Role,
  type SourceRef,
  type TargetType,
} from '@/lib/listening/types';
import {
  addContribution,
  addModeration,
  createCard,
  decideCorrection,
  RecordError,
  reviseCard,
  setPhase,
} from '@/lib/listening/writes.server';

export const notFound = () => NextResponse.json({ error: 'not_found' }, { status: 404 });
const fail = (status: number, code: string, message: string) =>
  NextResponse.json({ error: code, message }, { status });

/** Plain text only: strip control characters (keep newlines and tabs), trim, cap length. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
}

function oneOf<T extends string>(list: readonly T[], v: unknown): T | null {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : null;
}

function parseRefs(v: unknown): SourceRef[] | null {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > 40) return null;
  const out: SourceRef[] = [];
  for (const r of v) {
    if (!r || typeof r !== 'object') return null;
    const type = (r as { type?: unknown }).type;
    const id = (r as { id?: unknown }).id;
    if ((type !== 'segment' && type !== 'contribution') || typeof id !== 'string' || id.length > 64) return null;
    out.push({ type, id });
  }
  return out;
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

function timingFor(meeting: Meeting): 'before' | 'live' | 'after' {
  if (meeting.phase === 'before') return 'before';
  if (meeting.phase === 'live') return 'live';
  return 'after';
}

/** Phase moves each role may make. Council phases need a council role, which Phase 1 does not have. */
function phaseAllowed(role: Role | null, to: Phase): { ok: boolean; why?: string } {
  if (['before', 'live', 'preparing_draft'].includes(to)) {
    return canFacilitate(role) ? { ok: true } : { ok: false, why: 'Only a facilitator can move the meeting to this phase.' };
  }
  if (['verification_open', 'verification_closed'].includes(to)) {
    return isAdministrator(role)
      ? { ok: true }
      : { ok: false, why: 'Only an administrator can open or close community verification.' };
  }
  return { ok: false, why: 'Council screening and later phases need the council role, which is not set up yet (not yet adopted).' };
}

const actorOf = (v: ResolvedViewer): Actor => ({ userId: v.userId, name: v.name, role: v.role });

export async function handleAction(request: Request, slug: string): Promise<Response> {
  if (!listeningWorkspaceEnabled()) return notFound();
  if (!sameOrigin(request)) return fail(403, 'cross_origin', 'Cross-site request refused');
  if (!(request.headers.get('content-type') || '').includes('application/json')) {
    return fail(415, 'json_only', 'Send JSON');
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return fail(400, 'bad_json', 'Invalid JSON');
  }
  if (!body || typeof body !== 'object') return fail(400, 'bad_json', 'Invalid JSON');

  const pool = await listeningPool();
  const meeting = await getMeetingBySlug(slug);
  if (!meeting) return notFound();
  const viewer = await resolveViewer(pool, meeting.id);
  if (!viewer.signedIn || !viewer.userId) return fail(401, 'sign_in', 'Sign in to take part');
  const actor = actorOf(viewer);
  const type = String(body.type || '');

  try {
    switch (type) {
      case 'contribution.add': {
        const kind = oneOf<ContributionKind>(CONTRIBUTION_KINDS, body.kind);
        const targetType = oneOf<TargetType>(TARGET_TYPES, body.targetType ?? 'meeting');
        if (!kind || !targetType) return fail(400, 'invalid', 'Unknown contribution kind or target');
        const text = cleanText(body.body, LIMITS.body);
        if (!text) return fail(400, 'empty', 'Write something first');
        const proposedText = kind === 'correction_request' ? cleanText(body.proposedText, LIMITS.body) || null : null;
        if (kind === 'correction_request' && targetType === 'meeting') {
          return fail(400, 'target', 'A correction request needs a transcript segment, topic or card');
        }
        const nonce = cleanText(body.nonce, 64) || null;
        const k = `ctb:${viewer.userId}`;
        if (!allowHit(`${k}:m`, CONTRIBUTION_LIMITS.perMinute, 60_000) || !allowHit(`${k}:h`, CONTRIBUTION_LIMITS.perHour, 3600_000)) {
          return fail(429, 'rate_limited', 'You are posting very quickly. Wait a minute and try again.');
        }
        if (kind === 'question') {
          const open = await pool.query(
            `SELECT
               count(*) FILTER (WHERE c.author_user_id = $2) AS mine,
               count(*) AS total
             FROM dp_listen_contribution c
             WHERE c.meeting_id = $1 AND c.kind = 'question'
               AND NOT EXISTS (SELECT 1 FROM dp_listen_answer a WHERE a.question_id = c.id)
               AND NOT EXISTS (SELECT 1 FROM dp_listen_moderation m WHERE m.contribution_id = c.id AND m.action = 'combine')`,
            [meeting.id, viewer.userId],
          );
          if (Number(open.rows[0].mine) >= CONTRIBUTION_LIMITS.openQuestionsPerAccount) {
            return fail(429, 'question_limit', `You have ${CONTRIBUTION_LIMITS.openQuestionsPerAccount} open questions. Wait for answers before asking more.`);
          }
          if (Number(open.rows[0].total) >= CONTRIBUTION_LIMITS.openQuestionsPerMeeting) {
            return fail(429, 'queue_full', 'The question queue is full for this meeting.');
          }
        }
        const r = await withMeetingTx(meeting.id, actor, (tx) =>
          addContribution(tx, actor, {
            kind,
            targetType,
            targetId: targetType === 'meeting' ? null : cleanText(body.targetId, 64),
            body: text,
            proposedText,
            timing: timingFor(meeting),
            nonce,
          }),
        );
        return NextResponse.json({ ok: true, contribution: r.contribution, duplicate: r.duplicate }, { status: r.duplicate ? 200 : 201 });
      }

      case 'card.create':
      case 'card.revise':
      case 'moderation.add':
      case 'correction.decide':
      case 'phase.set':
      case 'role.grant': {
        if (!canFacilitate(viewer.role)) return fail(403, 'forbidden', 'Only a facilitator can do this');
        if (!allowHit(`fac:${viewer.userId}`, FACILITATOR_LIMITS.perMinute, 60_000)) {
          return fail(429, 'rate_limited', 'Too many actions. Wait a minute.');
        }
        return await facilitatorAction(type, body, meeting, viewer, actor);
      }

      default:
        return fail(400, 'unknown_action', 'Unknown action');
    }
  } catch (err) {
    if (err instanceof RecordError) return fail(err.status, err.code, err.message);
    console.error('[listening] action failed:', err instanceof Error ? err.message : err);
    return fail(500, 'server_error', 'Something went wrong. Your text is still in the box; try again.');
  }
}

async function facilitatorAction(
  type: string,
  body: Record<string, unknown>,
  meeting: Meeting,
  viewer: ResolvedViewer,
  actor: Actor,
): Promise<Response> {
  switch (type) {
    case 'card.create': {
      const cardType = oneOf<CardType>(CARD_TYPES, body.cardType);
      const label = body.label == null ? null : oneOf<CardLabel>(CARD_LABELS, body.label);
      const sourceRefs = parseRefs(body.sourceRefs);
      const title = cleanText(body.title, LIMITS.title);
      if (!cardType || sourceRefs === null || !title || (body.label != null && !label)) {
        return fail(400, 'invalid', 'Card needs a type, a title, and valid sources and label');
      }
      if (label === 'council_decision') return fail(403, 'council_only', 'Only the council can record a council decision (no council role yet).');
      const card = await withMeetingTx(meeting.id, actor, (tx) =>
        createCard(tx, actor, {
          parentId: cleanText(body.parentId, 64) || null,
          cardType,
          origin: 'facilitator',
          sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 1000,
          title,
          body: cleanText(body.body, LIMITS.body),
          label,
          sourceRefs,
          reason: cleanText(body.reason, LIMITS.reason) || null,
        }),
      );
      return NextResponse.json({ ok: true, card }, { status: 201 });
    }
    case 'card.revise': {
      const cardId = cleanText(body.cardId, 64);
      const baseRev = Number(body.baseRev);
      const label = body.label == null ? null : oneOf<CardLabel>(CARD_LABELS, body.label);
      const sourceRefs = parseRefs(body.sourceRefs);
      const title = cleanText(body.title, LIMITS.title);
      const status = body.status === 'withdrawn' ? 'withdrawn' : 'active';
      if (!cardId || !Number.isInteger(baseRev) || sourceRefs === null || !title || (body.label != null && !label)) {
        return fail(400, 'invalid', 'Revision needs the card, the revision you read, a title, and valid sources and label');
      }
      if (label === 'council_decision') return fail(403, 'council_only', 'Only the council can record a council decision (no council role yet).');
      const reason = cleanText(body.reason, LIMITS.reason);
      if (!reason) return fail(400, 'reason', 'Say why the card changes');
      const rev = await withMeetingTx(meeting.id, actor, (tx) =>
        reviseCard(tx, actor, cardId, baseRev, { title, body: cleanText(body.body, LIMITS.body), label, sourceRefs, status, reason }),
      );
      return NextResponse.json({ ok: true, rev });
    }
    case 'moderation.add': {
      const action = oneOf<ModerationAction>(MODERATION_ACTIONS, body.action);
      if (!action || action === 'correction_accepted' || action === 'correction_not_accepted') {
        return fail(400, 'invalid', 'Unknown moderation action');
      }
      const moderation = await withMeetingTx(meeting.id, actor, (tx) =>
        addModeration(tx, actor, {
          contributionId: cleanText(body.contributionId, 64),
          action,
          relatedId: cleanText(body.relatedId, 64) || null,
          note: cleanText(body.note, LIMITS.reason) || null,
        }),
      );
      return NextResponse.json({ ok: true, moderation }, { status: 201 });
    }
    case 'correction.decide': {
      const moderation = await withMeetingTx(meeting.id, actor, (tx) =>
        decideCorrection(
          tx,
          actor,
          cleanText(body.contributionId, 64),
          body.accepted === true,
          cleanText(body.note, LIMITS.reason) || null,
          cleanText(body.correctedText, LIMITS.body) || null,
        ),
      );
      return NextResponse.json({ ok: true, moderation }, { status: 201 });
    }
    case 'phase.set': {
      const to = oneOf<Phase>(PHASES, body.to);
      if (!to) return fail(400, 'invalid', 'Unknown phase');
      const allowed = phaseAllowed(viewer.role, to);
      if (!allowed.ok) return fail(403, 'forbidden', allowed.why || 'Not allowed');
      const change = await withMeetingTx(meeting.id, actor, (tx) => setPhase(tx, actor, to, cleanText(body.note, LIMITS.reason) || null));
      return NextResponse.json({ ok: true, change });
    }
    case 'role.grant': {
      if (!isAdministrator(viewer.role)) return fail(403, 'forbidden', 'Only an administrator can grant roles');
      const role = oneOf<Role>(ROLES, body.role);
      const userId = cleanText(body.userId, 64);
      if (!role || !userId) return fail(400, 'invalid', 'Give an account id and a role');
      if (RESERVED_ROLES.includes(role) || role === 'administrator') {
        return fail(403, 'reserved_role', 'This role is reserved and cannot be granted in Phase 1.');
      }
      const name = cleanText(body.name, 120) || null;
      await withMeetingTx(meeting.id, actor, async (tx) => {
        await tx.client.query(
          `INSERT INTO dp_listen_participant (meeting_id, user_id, display_name, role, granted_by)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (meeting_id, user_id) DO UPDATE SET role = EXCLUDED.role, display_name = COALESCE(EXCLUDED.display_name, dp_listen_participant.display_name),
             granted_by = EXCLUDED.granted_by, granted_at = now()`,
          [tx.meetingId, userId, name, role, viewer.userId],
        );
        await tx.emit({ kind: 'participant.role', entityType: 'participant', entityId: userId, data: { userId, name, role } });
      });
      return NextResponse.json({ ok: true });
    }
  }
  return fail(400, 'unknown_action', 'Unknown action');
}
