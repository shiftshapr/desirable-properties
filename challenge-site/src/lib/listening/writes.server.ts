/**
 * Meeting-record writes. Each runs inside withMeetingTx and appends the matching stream event.
 * Shared by the actions API and scripts/listening-import.ts. Content rows are never updated in place:
 * a change is a new revision row and a moved current_rev pointer.
 */
import {
  mapCardRev,
  mapContribution,
  mapModeration,
  mapSegmentRev,
  mapSpeaker,
  newId,
  readCardForTx,
  type MeetingTx,
  type Actor,
} from '@/lib/listening/store.server';
import {
  cardRevIsGrounded,
  type Card,
  type CardLabel,
  type CardType,
  type Contribution,
  type ContributionKind,
  type Moderation,
  type ModerationAction,
  type Phase,
  type Segment,
  type SourceRef,
  type Speaker,
  type TargetType,
} from '@/lib/listening/types';

export class RecordError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function addSpeaker(tx: MeetingTx, id: string, zoomDisplayName: string): Promise<Speaker | null> {
  const r = await tx.client.query(
    `INSERT INTO dp_listen_speaker (id, meeting_id, zoom_display_name) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING RETURNING *`,
    [id, tx.meetingId, zoomDisplayName],
  );
  if (!r.rows[0]) return null;
  const speaker = mapSpeaker(r.rows[0]);
  await tx.emit({ kind: 'speaker.added', entityType: 'speaker', entityId: speaker.id, data: { speaker } });
  return speaker;
}

export async function addSegment(
  tx: MeetingTx,
  actor: Actor,
  s: { id: string; sourceId: string; speakerId: string | null; startMs: number; endMs: number | null; section: string | null; text: string },
): Promise<Segment | null> {
  const r = await tx.client.query(
    `INSERT INTO dp_listen_segment (id, meeting_id, source_id, speaker_id, start_ms, end_ms, section_title)
     VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING RETURNING *`,
    [s.id, tx.meetingId, s.sourceId, s.speakerId, s.startMs, s.endMs, s.section],
  );
  if (!r.rows[0]) return null;
  const rev = await tx.client.query(
    `INSERT INTO dp_listen_segment_rev (segment_id, rev, text, kind, actor_user_id, actor_name)
     VALUES ($1, 1, $2, 'original', $3, $4) RETURNING *`,
    [s.id, s.text, actor.userId, actor.name],
  );
  const segment: Segment = {
    id: s.id,
    sourceId: s.sourceId,
    speakerId: s.speakerId,
    startMs: s.startMs,
    endMs: s.endMs,
    section: s.section,
    currentRev: 1,
    revs: [mapSegmentRev(rev.rows[0])],
  };
  await tx.emit({ kind: 'segment.added', entityType: 'segment', entityId: s.id, data: { segment } });
  return segment;
}

async function assertSourcesExist(tx: MeetingTx, refs: SourceRef[]) {
  for (const ref of refs) {
    const table = ref.type === 'segment' ? 'dp_listen_segment' : 'dp_listen_contribution';
    const r = await tx.client.query(`SELECT 1 FROM ${table} WHERE id = $1 AND meeting_id = $2`, [ref.id, tx.meetingId]);
    if (!r.rows[0]) throw new RecordError(400, 'unknown_source', `Unknown source: ${ref.type} ${ref.id}`);
  }
}

export type NewCard = {
  id?: string;
  importKey?: string | null;
  parentId: string | null;
  cardType: CardType;
  origin: Card['origin'];
  sortOrder?: number;
  title: string;
  body: string;
  label: CardLabel | null;
  sourceRefs: SourceRef[];
  reason?: string | null;
};

export async function createCard(tx: MeetingTx, actor: Actor, c: NewCard): Promise<Card | null> {
  if (!cardRevIsGrounded({ sourceRefs: c.sourceRefs, label: c.label })) {
    throw new RecordError(400, 'needs_source', 'A card needs a source, or the label "Claude synthesis" or "Proposal added after the meeting".');
  }
  await assertSourcesExist(tx, c.sourceRefs);
  if (c.parentId) {
    const p = await tx.client.query('SELECT 1 FROM dp_listen_card WHERE id = $1 AND meeting_id = $2', [c.parentId, tx.meetingId]);
    if (!p.rows[0]) throw new RecordError(400, 'unknown_parent', 'Unknown parent card');
  }
  const id = c.id ?? newId('card');
  const ins = await tx.client.query(
    `INSERT INTO dp_listen_card (id, meeting_id, parent_id, card_type, origin, import_key, sort_order, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING RETURNING *`,
    [id, tx.meetingId, c.parentId, c.cardType, c.origin, c.importKey ?? null, c.sortOrder ?? 0, actor.userId],
  );
  if (!ins.rows[0]) return null;
  const rev = await tx.client.query(
    `INSERT INTO dp_listen_card_rev (card_id, rev, title, body, label, source_refs, reason, base_rev, actor_user_id, actor_name, actor_role)
     VALUES ($1, 1, $2, $3, $4, $5, $6, NULL, $7, $8, $9) RETURNING *`,
    [id, c.title, c.body, c.label, JSON.stringify(c.sourceRefs), c.reason ?? null, actor.userId, actor.name, actor.role],
  );
  const r = ins.rows[0];
  const card: Card = {
    id,
    parentId: c.parentId,
    cardType: c.cardType,
    origin: c.origin,
    sortOrder: Number(r.sort_order),
    currentRev: 1,
    createdAt: new Date(r.created_at).toISOString(),
    revs: [mapCardRev(rev.rows[0])],
  };
  await tx.emit({ kind: 'card.created', entityType: 'card', entityId: id, data: { card } });
  return card;
}

/**
 * A new revision. `baseRev` must be the revision the editor read: if someone changed the card since,
 * the write is refused (409) so the editor reconciles instead of overwriting (spec §8).
 */
export async function reviseCard(
  tx: MeetingTx,
  actor: Actor,
  cardId: string,
  baseRev: number,
  next: { title: string; body: string; label: CardLabel | null; sourceRefs: SourceRef[]; status: 'active' | 'withdrawn'; reason: string | null },
) {
  const card = await readCardForTx(tx.client, tx.meetingId, cardId);
  if (!card) throw new RecordError(404, 'unknown_card', 'Unknown card');
  await tx.client.query('SELECT 1 FROM dp_listen_card WHERE id = $1 FOR UPDATE', [cardId]);
  if (card.currentRev !== baseRev) {
    throw new RecordError(409, 'stale_revision', `The card changed since you opened it (now revision ${card.currentRev}). Reload it and reapply your change.`);
  }
  if (!cardRevIsGrounded(next)) {
    throw new RecordError(400, 'needs_source', 'A card needs a source, or the label "Claude synthesis" or "Proposal added after the meeting".');
  }
  await assertSourcesExist(tx, next.sourceRefs);
  const rev = card.currentRev + 1;
  const ins = await tx.client.query(
    `INSERT INTO dp_listen_card_rev (card_id, rev, title, body, label, source_refs, status, reason, base_rev, actor_user_id, actor_name, actor_role)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [cardId, rev, next.title, next.body, next.label, JSON.stringify(next.sourceRefs), next.status, next.reason, baseRev, actor.userId, actor.name, actor.role],
  );
  await tx.client.query('UPDATE dp_listen_card SET current_rev = $2 WHERE id = $1', [cardId, rev]);
  const mapped = mapCardRev(ins.rows[0]);
  await tx.emit({ kind: 'card.revised', entityType: 'card', entityId: cardId, data: { cardId, rev: mapped } });
  return mapped;
}

export async function addContribution(
  tx: MeetingTx,
  actor: Actor,
  c: {
    kind: ContributionKind;
    targetType: TargetType;
    targetId: string | null;
    body: string;
    proposedText: string | null;
    timing: Contribution['timing'];
    nonce: string | null;
  },
): Promise<{ contribution: Contribution; duplicate: boolean }> {
  if (!actor.userId) throw new RecordError(401, 'sign_in', 'Sign in to contribute');
  if (c.nonce) {
    const prior = await tx.client.query(
      'SELECT * FROM dp_listen_contribution WHERE meeting_id = $1 AND author_user_id = $2 AND client_nonce = $3',
      [tx.meetingId, actor.userId, c.nonce],
    );
    if (prior.rows[0]) return { contribution: mapContribution(prior.rows[0]), duplicate: true };
  }
  if (c.targetType !== 'meeting') {
    if (!c.targetId) throw new RecordError(400, 'target', 'Missing target');
    const table = c.targetType === 'segment' ? 'dp_listen_segment' : 'dp_listen_card';
    const r = await tx.client.query(`SELECT 1 FROM ${table} WHERE id = $1 AND meeting_id = $2`, [c.targetId, tx.meetingId]);
    if (!r.rows[0]) throw new RecordError(400, 'target', 'Unknown target');
  }
  const id = newId('ctb');
  const ins = await tx.client.query(
    `INSERT INTO dp_listen_contribution (id, meeting_id, author_user_id, author_name, kind, target_type, target_id, body, proposed_text, timing, client_nonce)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [id, tx.meetingId, actor.userId, actor.name ?? '', c.kind, c.targetType, c.targetType === 'meeting' ? null : c.targetId, c.body, c.proposedText, c.timing, c.nonce],
  );
  const contribution = mapContribution(ins.rows[0]);
  await tx.emit({ kind: 'contribution.added', entityType: 'contribution', entityId: id, data: { contribution } });
  return { contribution, duplicate: false };
}

export async function addModeration(
  tx: MeetingTx,
  actor: Actor,
  m: { contributionId: string; action: ModerationAction; relatedId: string | null; note: string | null },
): Promise<Moderation> {
  const c = await tx.client.query('SELECT * FROM dp_listen_contribution WHERE id = $1 AND meeting_id = $2', [m.contributionId, tx.meetingId]);
  if (!c.rows[0]) throw new RecordError(404, 'unknown_contribution', 'Unknown contribution');
  if (m.action === 'combine') {
    if (!m.relatedId || m.relatedId === m.contributionId) throw new RecordError(400, 'combine', 'Choose another question to combine with');
    const t = await tx.client.query(
      "SELECT 1 FROM dp_listen_contribution WHERE id = $1 AND meeting_id = $2 AND kind = 'question'",
      [m.relatedId, tx.meetingId],
    );
    if (!t.rows[0]) throw new RecordError(400, 'combine', 'Unknown question to combine with');
  }
  const id = newId('mod');
  const ins = await tx.client.query(
    `INSERT INTO dp_listen_moderation (id, meeting_id, contribution_id, action, related_id, note, actor_user_id, actor_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, tx.meetingId, m.contributionId, m.action, m.relatedId, m.note, actor.userId, actor.name],
  );
  const moderation = mapModeration(ins.rows[0]);
  await tx.emit({ kind: 'moderation.added', entityType: 'moderation', entityId: id, data: { moderation } });
  return moderation;
}

/** Accept or decline a correction request. Accepting adds a segment revision; the original stays as rev 1. */
export async function decideCorrection(
  tx: MeetingTx,
  actor: Actor,
  contributionId: string,
  accepted: boolean,
  note: string | null,
  correctedText: string | null,
) {
  const c = await tx.client.query(
    "SELECT * FROM dp_listen_contribution WHERE id = $1 AND meeting_id = $2 AND kind = 'correction_request'",
    [contributionId, tx.meetingId],
  );
  const row = c.rows[0];
  if (!row) throw new RecordError(404, 'unknown_correction', 'Unknown correction request');
  const prior = await tx.client.query(
    "SELECT 1 FROM dp_listen_moderation WHERE contribution_id = $1 AND action IN ('correction_accepted', 'correction_not_accepted')",
    [contributionId],
  );
  if (prior.rows[0]) throw new RecordError(409, 'already_decided', 'This correction request already has a decision');
  if (accepted && row.target_type === 'segment') {
    const text = (correctedText ?? row.proposed_text ?? '').trim();
    if (!text) throw new RecordError(400, 'corrected_text', 'Give the corrected text');
    const seg = await tx.client.query('SELECT current_rev FROM dp_listen_segment WHERE id = $1 FOR UPDATE', [row.target_id]);
    const rev = Number(seg.rows[0].current_rev) + 1;
    const ins = await tx.client.query(
      `INSERT INTO dp_listen_segment_rev (segment_id, rev, text, kind, correction_id, actor_user_id, actor_name)
       VALUES ($1, $2, $3, 'correction', $4, $5, $6) RETURNING *`,
      [row.target_id, rev, text, contributionId, actor.userId, actor.name],
    );
    await tx.client.query('UPDATE dp_listen_segment SET current_rev = $2 WHERE id = $1', [row.target_id, rev]);
    await tx.emit({
      kind: 'segment.revised',
      entityType: 'segment',
      entityId: row.target_id,
      data: { segmentId: row.target_id, rev: mapSegmentRev(ins.rows[0]) },
    });
  }
  return addModeration(tx, actor, {
    contributionId,
    action: accepted ? 'correction_accepted' : 'correction_not_accepted',
    relatedId: null,
    note,
  });
}

export async function setPhase(tx: MeetingTx, actor: Actor, to: Phase, note: string | null) {
  const cur = await tx.client.query('SELECT phase FROM dp_listen_meeting WHERE id = $1', [tx.meetingId]);
  const from = cur.rows[0].phase as Phase;
  if (from === to) throw new RecordError(409, 'same_phase', 'The meeting is already in that phase');
  await tx.client.query('UPDATE dp_listen_meeting SET phase = $2 WHERE id = $1', [tx.meetingId, to]);
  const createdAt = new Date().toISOString();
  const seq = await tx.emit({
    kind: 'phase.changed',
    entityType: 'meeting',
    entityId: tx.meetingId,
    data: { change: { from, to, note, actorName: actor.name, actorRole: actor.role, createdAt } },
  });
  return { seq, from, to, note, actorName: actor.name, actorRole: actor.role, createdAt };
}
