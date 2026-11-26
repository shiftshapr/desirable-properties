/**
 * A session ballot that follows council screening (the voted process: 48-hour review, then the interim council
 * screens for 24 hours, no objection per question, then a 72-hour community vote).
 *
 * The ballot definition in code carries every draft question, exactly as drafted. At the screening close the
 * outcome per question is final: a question with a standing objection is held back (shown with the objections and
 * reasons, never votable); every other question goes to the ballot as drafted. Before the close nothing is votable.
 *
 * Fails closed: a question with no screening outcome, or an outcome still pending after the close, throws, so the
 * caller treats the ballot as unavailable rather than guessing what is on it.
 *
 * The votable definition keeps the question keys (q1..q9, stored with each vote) and renumbers `n` 1..k, because the
 * store (Gov Hub) requires consecutive numbers; pages show the draft numbers (withDraftNumbers, ballot-core.ts).
 *
 * Pure (no runtime imports): scripts/ballot-2026-11-23.test.mjs drives it directly.
 */
import type { BallotDefinition, HeldBackQuestion, ResolvedBallot } from './ballot-core';
import type { QuestionScreening } from '../screening/screening-core';

export function applyScreening(
  def: BallotDefinition,
  screened: readonly Pick<QuestionScreening, 'key' | 'outcome' | 'standing'>[],
  now: Date,
): ResolvedBallot {
  if (!def.screenedBy) return { state: 'ready', votable: def, heldBack: [] };
  if (now.getTime() < new Date(def.opensAt).getTime()) return { state: 'pending' };
  const byKey = new Map(screened.map((q) => [q.key, q]));
  const heldBack: HeldBackQuestion[] = [];
  const kept = def.questions.filter((q) => {
    const s = byKey.get(q.key);
    if (!s || s.outcome === 'pending') throw new Error(`${def.slug}: no final screening outcome for ${q.key}`);
    if (s.outcome === 'goes_to_ballot') return true;
    heldBack.push({
      key: q.key,
      n: q.n,
      question: q.question,
      objections: s.standing.map((o) => ({ name: o.name, reason: o.reason, createdAt: o.createdAt })),
    });
    return false;
  });
  const votable: BallotDefinition = { ...def, questions: kept.map((q, i) => ({ ...q, n: i + 1 })) };
  return { state: 'ready', votable, heldBack };
}
