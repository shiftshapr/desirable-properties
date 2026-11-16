/**
 * Client state for the workspace: a snapshot plus stream events applied in seq order.
 * Unchanged entities keep their object identity, so memoized rows do not re-render and nothing
 * the reader is looking at (open threads, drafts, scroll) is disturbed by an update.
 */
import type { Snapshot, WorkspaceEvent } from '@/lib/listening/types';

export type WorkspaceState = Snapshot & { applied: number };

export function initState(snap: Snapshot): WorkspaceState {
  return { ...snap, applied: snap.cursor };
}

export function applyEvent(state: WorkspaceState, e: WorkspaceEvent): WorkspaceState {
  if (e.seq <= state.applied) return state; // already applied (replay after reconnect)
  const next: WorkspaceState = { ...state, applied: e.seq, cursor: e.seq };
  switch (e.kind) {
    case 'speaker.added':
      if (!state.speakers.some((s) => s.id === e.speaker.id)) next.speakers = [...state.speakers, e.speaker];
      break;
    case 'segment.added': {
      if (state.segments.some((s) => s.id === e.segment.id)) break;
      const segs = [...state.segments, e.segment];
      // Usually appended in time order; keep the list sorted if not.
      if (state.segments.length && state.segments[state.segments.length - 1].startMs > e.segment.startMs) {
        segs.sort((a, b) => a.startMs - b.startMs || a.id.localeCompare(b.id));
      }
      next.segments = segs;
      break;
    }
    case 'segment.revised':
      next.segments = state.segments.map((s) =>
        s.id === e.segmentId && !s.revs.some((r) => r.rev === e.rev.rev)
          ? { ...s, currentRev: e.rev.rev, revs: [...s.revs, e.rev] }
          : s,
      );
      break;
    case 'card.created':
      if (!state.cards.some((c) => c.id === e.card.id)) next.cards = [...state.cards, e.card];
      break;
    case 'card.revised':
      next.cards = state.cards.map((c) =>
        c.id === e.cardId && !c.revs.some((r) => r.rev === e.rev.rev)
          ? { ...c, currentRev: e.rev.rev, revs: [...c.revs, e.rev] }
          : c,
      );
      break;
    case 'contribution.added':
      if (!state.contributions.some((c) => c.id === e.contribution.id)) {
        next.contributions = [...state.contributions, e.contribution];
      }
      break;
    case 'moderation.added':
      if (!state.moderation.some((m) => m.id === e.moderation.id)) next.moderation = [...state.moderation, e.moderation];
      break;
    case 'phase.changed':
      next.meeting = { ...state.meeting, phase: e.change.to };
      next.phaseHistory = [...state.phaseHistory, { ...e.change, seq: e.seq }];
      break;
    case 'meeting.updated':
      next.meeting = { ...state.meeting, ...e.meeting };
      break;
    case 'participant.role':
      if (state.viewer.userId && state.viewer.userId === e.userId && state.viewer.role !== 'administrator') {
        next.viewer = { ...state.viewer, role: e.role };
      }
      break;
  }
  return next;
}

/** Question queue state derived from moderation (latest action of each kind wins). */
export type QuestionState = {
  prioritized: boolean;
  deferred: boolean;
  combinedInto: string | null;
  answered: boolean;
};

export function questionStates(state: Pick<WorkspaceState, 'moderation'>): Map<string, QuestionState> {
  const out = new Map<string, QuestionState>();
  const get = (id: string) => {
    let q = out.get(id);
    if (!q) {
      q = { prioritized: false, deferred: false, combinedInto: null, answered: false };
      out.set(id, q);
    }
    return q;
  };
  for (const m of state.moderation) {
    const q = get(m.contributionId);
    if (m.action === 'prioritize') q.prioritized = true;
    if (m.action === 'deprioritize') q.prioritized = false;
    if (m.action === 'defer') q.deferred = true;
    if (m.action === 'undefer') q.deferred = false;
    if (m.action === 'combine') q.combinedInto = m.relatedId;
  }
  return out;
}

export type CorrectionDecision = { accepted: boolean; note: string | null; actorName: string | null; createdAt: string };

export function correctionDecisions(state: Pick<WorkspaceState, 'moderation'>): Map<string, CorrectionDecision> {
  const out = new Map<string, CorrectionDecision>();
  for (const m of state.moderation) {
    if (m.action === 'correction_accepted' || m.action === 'correction_not_accepted') {
      out.set(m.contributionId, {
        accepted: m.action === 'correction_accepted',
        note: m.note,
        actorName: m.actorName,
        createdAt: m.createdAt,
      });
    }
  }
  return out;
}
